// TODO: Use duckdb-async?
import {
  QueryRequest,
  QueryResponse,
  Expression,
  Query,
  RowSet,
  Forbidden,
  Conflict,
  Relationship,
  ObjectField, 
  Type
} from "@hasura/ndc-sdk-typescript";
import { Configuration, State } from "..";
const SqlString = require("sqlstring-sqlite");
import { MAX_32_INT } from "../constants";
import { format } from "sql-formatter";

const escape_single = (s: any) => SqlString.escape(s);
const escape_double = (s: any) => `"${SqlString.escape(s).slice(1, -1)}"`;

function getColumnExpression(field_def: ObjectField, collection_alias: string, column: string): string {
  // Helper function to handle the actual type
  function handleNamedType(type: Type): string {
    if (type.type != "named"){
      throw new Forbidden("Named type must be named type", {});
    }
    switch (type.name){
      case "BigInt":
        return `CAST(${escape_double(collection_alias)}.${escape_double(column)} AS TEXT)`;
      case "UBigInt":
        return `CAST(${escape_double(collection_alias)}.${escape_double(column)} AS TEXT)`;
      case "HugeInt":
        return `CAST(${escape_double(collection_alias)}.${escape_double(column)} AS TEXT)`;
      case "UHugeInt":
        return `CAST(${escape_double(collection_alias)}.${escape_double(column)} AS TEXT)`;
      default:
        return `${escape_double(collection_alias)}.${escape_double(column)}`;
    }
  }
  // Helper function to traverse the type structure
  function processType(type: Type): string {
    if (type.type === "nullable") {
      if (type.underlying_type.type === "named") {
        return handleNamedType(type.underlying_type);
      } else if (type.underlying_type.type === "array") {
        // Handle array type
        return processType(type.underlying_type);
      } else {
        return processType(type.underlying_type);
      }
    } else if (type.type === "array") {
      // Handle array type
      return processType(type.element_type);
    } else if (type.type === "named") {
      return handleNamedType(type);
    }
    // Default case
    return `${escape_double(collection_alias)}.${escape_double(column)}`;
  }
  return processType(field_def.type);
}

function isStringType(field_def: ObjectField | undefined): boolean {
  if (!field_def) return false;
  
  function checkType(type: any): boolean {
    if (type.type === "nullable") {
      return checkType(type.underlying_type);
    }
    if (type.type === "array") {
      return false;
    }
    return type.type === "named" && type.name === "String";
  }
  
  return checkType(field_def.type);
}

function isTimestampType(field_def: ObjectField | undefined): boolean {
  if (!field_def) return false;
  
  function checkType(type: any): boolean {
    if (type.type === "nullable") {
      return checkType(type.underlying_type);
    }
    return type.type === "named" && (type.name === "Timestamp" || type.name === "TimestampTz");
  }
  
  return checkType(field_def.type);
}
function getIntegerType(field_def: ObjectField | undefined): string | null {
  if (!field_def) return null;
  
  function checkType(type: any): string | null {
    if (type.type === "nullable") {
      return checkType(type.underlying_type);
    }
    if (type.type === "named") {
      switch (type.name) {
        case "BigInt": return "BIGINT";
        case "UBigInt": return "UBIGINT";
        case "HugeInt": return "HUGEINT";
        case "UHugeInt": return "UHUGEINT";
        default: return null;
      }
    }
    return null;
  }
  
  return checkType(field_def.type);
}
function getRhsExpression(type: string | null): string {
  if (!type) return "?";
  return `CAST(? AS ${type})`;
}

function buildSingleColumnAggregate(column: string, func: string, agg_name: string): string {
  switch (func) {
    // Basic aggregates
    case "_sum": 
      return `SUM(${column}) as ${escape_double(agg_name)}`;
    case "_avg": 
      return `AVG(${column}) as ${escape_double(agg_name)}`;
    case "_max": 
      return `MAX(${column}) as ${escape_double(agg_name)}`;
    case "_min": 
      return `MIN(${column}) as ${escape_double(agg_name)}`;
    
    // Statistical functions
    case "_stddev":
    case "_stddev_samp": {
      const formula = `SQRT(
        (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
        / (COUNT(*) * (COUNT(*) - 1))
      )`;
      return `${formula} as ${escape_double(agg_name)}`;
    }
    case "_stddev_pop": {
      const formula = `SQRT(
        (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
        / (COUNT(*) * COUNT(*))
      )`;
      return `${formula} as ${escape_double(agg_name)}`;
    }
    case "_variance":
    case "_var_samp": {
      const formula = `(
        (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
        / (COUNT(*) * (COUNT(*) - 1))
      )`;
      return `${formula} as ${escape_double(agg_name)}`;
    }
    case "_var_pop": {
      const formula = `(
        (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
        / (COUNT(*) * COUNT(*))
      )`;
      return `${formula} as ${escape_double(agg_name)}`;
    }
    
    // String aggregates
    case "_group_concat":
      return `GROUP_CONCAT(${column}) as ${escape_double(agg_name)}`;
    case "_group_concat_distinct":
      return `GROUP_CONCAT(DISTINCT ${column}) as ${escape_double(agg_name)}`;
    case "_group_concat_include_nulls":
      return `GROUP_CONCAT(COALESCE(${column}, 'NULL')) as ${escape_double(agg_name)}`;
    default:
      throw new Forbidden(`Unsupported aggregate function: ${func}`, {});
  }
}

function buildAggregateColumns(
  aggregates: { [key: string]: any }, 
  subquery_prefix: string = 'subq'
): string[] {
  const agg_columns: string[] = [];
  for (const [agg_name, agg_value] of Object.entries(aggregates)) {
    switch (agg_value.type) {
      case "star_count": 
        agg_columns.push(`COUNT(*) as ${escape_double(agg_name)}`);
        break;
      case "column_count": {
        const column = `${subquery_prefix}.${escape_double(agg_value.column)}`;
        const column_expr = agg_value.distinct
          ? `COUNT(DISTINCT ${column})`
          : `COUNT(${column})`;
        agg_columns.push(`${column_expr} as ${escape_double(agg_name)}`);
        break;
      }
      case "single_column": {
        const column = `${subquery_prefix}.${escape_double(agg_value.column)}`;
        agg_columns.push(
          buildSingleColumnAggregate(column, agg_value.function, agg_name)
        );
        break;
      }
      default:
        throw new Forbidden(`Unsupported aggregate type: ${agg_value.type}`, {});
    }
  }
  return agg_columns;
}


type QueryVariables = {
  [key: string]: any;
};

export type SQLQuery = {
  runSql: boolean;
  runAgg: boolean;
  runGroup: boolean;
  sql: string;
  args: any[];
  aggSql: string;
  aggArgs: any[];
  groupSql: string;
  groupArgs: any[];
};

const formatSQLWithArgs = (sql: string, args: any[]): string => {
  let index = 0;
  return sql.replace(/\?/g, () => {
    const arg = args[index++];
    if (typeof arg === 'string') {
      return `'${arg}'`;
    } else if (arg === null) {
      return 'NULL';
    } else {
      return arg;
    }
  });
};

function wrap_data(s: string): string {
  return `
  SELECT
  (
    ${s}
  ) as data
  `;
}

function wrap_rows(s: string): string {
  return `
  SELECT
    JSON_OBJECT('rows', COALESCE(JSON_GROUP_ARRAY(JSON(r)), JSON('[]')))
  FROM
    (
      ${s}
    )
  `;
}

function build_where(
  expression: Expression,
  collection_relationships: {
    [k: string]: Relationship;
  },
  args: any[],
  variables: QueryVariables,
  prefix: string,
  collection_aliases: { [k: string]: string },
  config: Configuration,
  query_request: QueryRequest
): string {
  let sql = "";
  switch (expression.type) {
    case "unary_comparison_operator":
      if (expression.column.type === "aggregate"){
        throw new Forbidden("Binary Comparison Operator Aggregate not implemented", {});
      }
      switch (expression.operator) {
        case "is_null":
          sql = `${expression.column.name} IS NULL`;
          break;
        default:
          throw new Forbidden("Unknown Unary Comparison Operator", {
            "Unknown Operator": "This should never happen.",
          });
      }
      break;
    case "binary_comparison_operator":
      if (expression.column.type === "aggregate"){
        throw new Forbidden("Binary Comparison Operator Aggregate not implemented", {});
      }
      const object_type = config.config?.object_types[query_request.collection];
      const field_def = object_type?.fields[expression.column.name];
      const isTimestamp = isTimestampType(field_def);
      const integerType = getIntegerType(field_def);
      const type = isTimestamp ? "TIMESTAMP" : integerType;
      const lhs = escape_double(expression.column.name);
      const rhs = getRhsExpression(type);
      switch (expression.value.type) {
        case "scalar":
          args.push(expression.value.value);
          break;
        case "variable":
          if (variables !== null) {
            args.push(variables[expression.value.name]);
          }
          break;
        case "column":
          throw new Forbidden("Not implemented", {});
        default:
          throw new Forbidden("Unknown Binary Comparison Value Type", {});
      }
      switch (expression.operator) {
        case "_eq":
          sql = `${lhs} = ${rhs}`;
          break;
        case "_like":
          sql = `${lhs} LIKE ?`;
          break;
        case "_glob":
          sql = `${lhs} GLOB ?`;
          break;
        case "_neq":
          sql = `${lhs} != ${rhs}`;
          break;
        case "_gt":
          sql = `${lhs} > ${rhs}`;
          break;
        case "_lt":
          sql = `${lhs} < ${rhs}`;
          break;
        case "_gte":
          sql = `${lhs} >= ${rhs}`;
          break;
        case "_lte":
          sql = `${lhs} <= ${rhs}`;
          break;
        default:
          throw new Forbidden(
            `Binary Comparison Custom Operator ${expression.operator} not implemented`,
            {}
          );
      }
      break;
    case "and":
      if (expression.expressions.length === 0) {
        sql = "1";
      } else {
        const clauses = [];
        for (const expr of expression.expressions) {
          const res = build_where(expr, collection_relationships, args, variables, prefix, collection_aliases, config, query_request);
          clauses.push(res);
        }
        sql = `(${clauses.join(` AND `)})`;
      }
      break;
    case "or":
      if (expression.expressions.length === 0) {
        sql = "1";
      } else {
        const clauses = [];
        for (const expr of expression.expressions) {
          const res = build_where(expr, collection_relationships, args, variables, prefix, collection_aliases, config, query_request);
          clauses.push(res);
        }
        sql = `(${clauses.join(` OR `)})`;
      }
      break;
    case "not":
      const not_result = build_where(expression.expression, collection_relationships, args, variables, prefix, collection_aliases, config, query_request);
      sql = `NOT (${not_result})`;
      break;
    case "exists":
      const { in_collection, predicate } = expression;
      let subquery_sql = "";
      let subquery_alias = `${prefix}_exists`;

      if (in_collection.type === "related") {
        const relationship = collection_relationships[in_collection.relationship];
        let from_collection_alias = collection_aliases[relationship.target_collection];
        subquery_sql = `
          SELECT 1
          FROM ${from_collection_alias} AS ${escape_double(subquery_alias)}
          WHERE ${predicate ? build_where(predicate, collection_relationships, args, variables, subquery_alias, collection_aliases, config, query_request) : '1 = 1'}
          AND ${Object.entries(relationship.column_mapping).map(([from, to]) => {
            return `${escape_double(prefix)}.${escape_double(from)} = ${escape_double(subquery_alias)}.${escape_double(to)}`;
          }).join(" AND ")}
        `;
      } else if (in_collection.type === "unrelated") {
        throw new Forbidden("Unrelated collection type not supported!", {});
      }

      sql = `EXISTS (${subquery_sql})`;
      break;
    default:
      throw new Forbidden("Unknown Expression Type!", {});
  }
  return sql;
}

function build_query(
  config: Configuration,
  query_request: QueryRequest,
  collection: string,
  query: Query,
  path: string[],
  variables: QueryVariables,
  args: any[],
  agg_args: any[],
  group_args: any[],
  relationship_key: string | null,
  collection_relationships: {
    [k: string]: Relationship;
  },
  collection_aliases: {[k: string]: string}
): SQLQuery {
  if (!config.config) {
    throw new Forbidden("Must supply config", {});
  }
  let sql = "";
  let agg_sql = "";
  let group_sql = "";
  let run_sql = false;
  let run_agg = false;
  let run_group = false;
  path.push(collection);
  // console.log(`ENTERING ${path}`);
  let collection_alias = path.join("_");
  let from_sql = `${collection} as ${escape_double(collection_alias)}`;

  let limit_sql = ``;
  let offset_sql = ``;
  let order_by_sql = ``;
  let collect_rows = [];
  let where_conditions = ["WHERE 1"];
  let agg_where_conditions = ["WHERE 1"];
  if (query.fields) {
    run_sql = true;
    for (let [field_name, field_value] of Object.entries(query.fields)) {
      collect_rows.push(escape_single(field_name));
      switch (field_value.type) {
        case "column":
            const current_collection = path.length > 1 && relationship_key 
            ? query_request.collection_relationships[relationship_key].target_collection
            : query_request.collection;
          const object_type = config.config?.object_types[current_collection];
          let field_def = object_type.fields[field_value.column];
          collect_rows.push(getColumnExpression(field_def, collection_alias, field_value.column));
          break;
        case "relationship":
          let relationship_collection = query_request.collection_relationships[field_value.relationship].target_collection;
          let relationship_collection_alias = config.config.collection_aliases[relationship_collection];

          const subquery = build_query(
            config,
            query_request,
            relationship_collection_alias,
            field_value.query,
            path,
            variables,
            args,
            agg_args,
            group_args,
            field_value.relationship,
            collection_relationships,
            collection_aliases
          );

          let relationship_sql = '';
          const hasOnlyAggregates = subquery.runAgg && !field_value.query.fields;

          if (hasOnlyAggregates) {
            relationship_sql = `
              SELECT JSON_OBJECT(
                'aggregates', (
                  ${subquery.aggSql}
                )
              )
            `;
          } else if (subquery.runAgg) {
            relationship_sql = `
              SELECT JSON_OBJECT(
                'rows', JSON((${subquery.sql})).rows,
                'aggregates', (
                  ${subquery.aggSql}
                )
              )
            `;
          } else {
            relationship_sql = subquery.sql;
          }

          collect_rows.push(
            `COALESCE((
              ${relationship_sql}
            ), JSON('[]'))`
          );
          path.pop();
          // console.log(`RETURNING TO ${path}`);
          break;
        default:
          throw new Conflict("The types tricked me. 😭", {});
      }
    }
  }

  if (query.groups) {
    run_group = true;
    const { dimensions, aggregates } = query.groups;

    const dimensionExpressions = dimensions.map(dim => {
      if (dim.type !== "column") {
        throw new Forbidden("Only column dimensions are supported", {});
      }
      
      const object_type = config.config?.object_types[query_request.collection];
      const field_def = object_type?.fields[dim.column_name];
      
      if (!field_def) {
        return `subq.${escape_double(dim.column_name)}`;
      }

      function handleNamedType(type: Type): string {
        if (type.type != "named") {
          throw new Forbidden("Named type must be named type", {});
        }
        switch (type.name) {
          case "BigInt":
          case "UBigInt":
          case "HugeInt":
          case "UHugeInt":
            return `subq.${escape_double(dim.column_name)}`;
          default:
            return `subq.${escape_double(dim.column_name)}`;
        }
      }

      function processType(type: Type): string {
        if (type.type === "nullable") {
          if (type.underlying_type.type === "named") {
            return handleNamedType(type.underlying_type);
          } else if (type.underlying_type.type === "array") {
            return processType(type.underlying_type);
          } else {
            return processType(type.underlying_type);
          }
        } else if (type.type === "array") {
          return processType(type.element_type);
        } else if (type.type === "named") {
          return handleNamedType(type);
        }
        return `subq.${escape_double(dim.column_name)}`;
      }

      return processType(field_def.type);
    });


    // console.log("GROUPS");
    // console.log(query.groups);


    if (query.groups.predicate){
      throw new Forbidden("Grouping with predicate not supported yet", {});
    }

    const dimensionNames = dimensions.map(d => d.column_name);

    const agg_columns = buildAggregateColumns(aggregates, "subq");

    const selectExpressions = dimensions.map((dim, i) => {
      const object_type = config.config?.object_types[query_request.collection];
      const field_def = object_type?.fields[dim.column_name];
      const integerType = getIntegerType(field_def);
      const isString = isStringType(field_def); // Check if the field is a string type
    
      if (integerType) {
        return [
          `${dimensionExpressions[i]} as ${escape_double(`_sort_${dim.column_name}`)}`,
          `CAST(${dimensionExpressions[i]} AS TEXT) as ${escape_double(dim.column_name)}`
        ];
      } else if (isString) {
        return [
          `${dimensionExpressions[i]} as ${escape_double(dim.column_name)}`
        ];
      } else {
        return [`${dimensionExpressions[i]} as ${escape_double(dim.column_name)}`];
      }
    }).flat();

    let orderByClause = '';
    if (query.groups.order_by && query.groups.order_by.elements.length > 0) {
      const orderElements = query.groups.order_by.elements.map(elem => {
        if (elem.target.type === 'dimension') {
          const dimension = dimensions[elem.target.index];
          const object_type = config.config?.object_types[query_request.collection];
          const field_def = object_type?.fields[dimension.column_name];
          const integerType = getIntegerType(field_def);
          const isString = isStringType(field_def); // Check if the field is a string type
    
          const columnName = integerType ? `_sort_${dimension.column_name}` : dimension.column_name;
    
          const columnExpression = isString 
            ? `LOWER(${escape_double(columnName)})`
            : `${escape_double(columnName)}`;
    
          return `${columnExpression} ${elem.order_direction}`;
        }
        throw new Forbidden(`Unsupported order by target type: ${elem.target.type}`, {});
      });
      orderByClause = `ORDER BY ${orderElements.join(', ')}`;
    }

    group_sql = `
    SELECT 
      COALESCE(
        to_json(
          list(
            JSON_OBJECT(
              'dimensions', JSON_ARRAY(${dimensionNames.map(name => escape_double(name)).join(', ')}),
              'aggregates', JSON_OBJECT(${Object.keys(aggregates).map(name => 
                `${escape_single(name)}, ${escape_double(name)}`
              ).join(', ')})
            )
            ${orderByClause}
          )
        ),
        JSON('[]')
      ) as data
    FROM (
      SELECT
        ${selectExpressions.join(',\n        ')},
        ${agg_columns.join(', ')}
      FROM (
        SELECT * 
        FROM ${collection} as ${escape_double(collection_alias)}
      ) subq
      GROUP BY ${dimensionExpressions.join(', ')}
    ) grouped_data
    `;

    if (path.length === 1) {
      group_sql = wrap_data(group_sql);
    }
  }

  if (path.length > 1 && relationship_key !== null) {
    // console.log("RELATIONSHIP MAIN");
    let relationship = query_request.collection_relationships[relationship_key];
    let parent_alias = path.slice(0, -1).join("_");
    let relationship_alias = config.config.collection_aliases[relationship.target_collection];
    from_sql = `${relationship_alias} as ${escape_double(collection_alias)}`;
    const condition = Object.entries(relationship.column_mapping).map(([from, to]) => {
      return `${escape_double(parent_alias)}.${escape_double(from)} = ${escape_double(collection_alias)}.${escape_double(to)}`;
    })
    where_conditions.push(
      ...condition
    );
    agg_where_conditions.push(
      ...condition
    );
  }

  const filter_joins: string[] = [];

  if (query.predicate) {
    where_conditions.push(`(${build_where(query.predicate, query_request.collection_relationships, args, variables, collection_alias, config.config.collection_aliases, config, query_request)})`);
    agg_where_conditions.push(`(${build_where(query.predicate, query_request.collection_relationships, agg_args, variables, collection_alias, config.config.collection_aliases, config, query_request)})`);
  }

  if (query.order_by && config.config) {
    let order_elems: string[] = [];
    for (let elem of query.order_by.elements) {
      switch (elem.target.type) {
        case "column":
          if (elem.target.path.length === 0){
            const field_def = config.config.object_types[query_request.collection].fields[elem.target.name];
            const is_string = isStringType(field_def);
            const field_name = is_string ? `${escape_double(collection_alias)}.${escape_double(elem.target.name)} COLLATE NOCASE` : `${escape_double(collection_alias)}.${escape_double(elem.target.name)}`
            order_elems.push(
              `${field_name} ${elem.order_direction}`
            );
          } else {
            let currentAlias = collection_alias;
            let current_collection = query_request.collection;
            let field_def = config.config.object_types[current_collection].fields[elem.target.name];
            for (let path_elem of elem.target.path) {
              const relationship = collection_relationships[path_elem.relationship];
              const nextAlias = `${currentAlias}_${relationship.target_collection}`;
              const target_collection_alias = collection_aliases[relationship.target_collection];
              const join_str = `JOIN ${target_collection_alias} AS ${escape_double(nextAlias)} ON ${Object.entries(relationship.column_mapping).map(([from, to]) => `${escape_double(currentAlias)}.${escape_double(from)} = ${escape_double(nextAlias)}.${escape_double(to)}`).join(" AND ")}`;
              if (!filter_joins.includes(join_str)) {
                filter_joins.push(join_str);
              }
              currentAlias = nextAlias;
              current_collection = relationship.target_collection;
              field_def = config.config.object_types[current_collection].fields[elem.target.name];
            }
            const is_string = isStringType(field_def);
            const field_name = is_string ? `${escape_double(currentAlias)}.${escape_double(elem.target.name)} COLLATE NOCASE` : `${escape_double(currentAlias)}.${escape_double(elem.target.name)}`;
            order_elems.push(
              `${field_name} ${elem.order_direction}`
            );
          }
          break;
        case "aggregate":
          throw new Forbidden("Order By Aggregate not supported yet", {});
        default:
          throw new Forbidden("The types lied 😭", {});
      }
    }
    if (order_elems.length > 0) {
      order_by_sql = `ORDER BY ${order_elems.join(" , ")}`;
    }
  }

  if (query.limit) {
    limit_sql = `LIMIT ${escape_single(query.limit)}`;
  }

  if (query.offset) {
    if (!query.limit) {
      limit_sql = `LIMIT ${MAX_32_INT}`;
    }
    offset_sql = `OFFSET ${escape_single(query.offset)}`;
  }

  sql = wrap_rows(`
SELECT
JSON_OBJECT(${collect_rows.join(",")}) as r
FROM ${from_sql}
${filter_joins.join(" ")}
${where_conditions.join(" AND ")}
${order_by_sql}
${limit_sql}
${offset_sql}
`);

  if (query.aggregates) {
    run_agg = true;

    const agg_columns = buildAggregateColumns(query.aggregates, "subq");
  
    agg_sql = wrap_data(`
      SELECT JSON_OBJECT(
        ${agg_columns
          .map((col) => {
            const parts = col.split(" as ");
            return `${escape_single(parts[1].replace('"', '').replace('"', ''))}, ${parts[0]}`;
          })
          .join(",")}
      ) as data
      FROM (
        SELECT * 
        FROM ${from_sql}
        ${agg_where_conditions.join(" AND ")}  
        ${order_by_sql}
        ${limit_sql}
        ${offset_sql}
      ) subq
    `);
  }

  if (path.length === 1) {
    sql = wrap_data(sql);
    // if (run_sql){
    //   console.log("QUERY");
    //   console.log(format(formatSQLWithArgs(sql, args), { language: "sqlite" }));
    // }
    // if (run_agg){
    //   console.log("AGGREGATE");
    //   console.log(format(formatSQLWithArgs(agg_sql, agg_args), { language: "sqlite" }));
    // }
    // if (run_group){
    //   console.log("GROUP");
    //   console.log(format(formatSQLWithArgs(group_sql, group_args), { language: "sqlite" }));
    // }
  }

  return {
    runSql: run_sql,
    runAgg: run_agg,
    runGroup: run_group,
    sql,
    args,
    aggSql: agg_sql,
    aggArgs: agg_args,
    groupSql: group_sql,
    groupArgs: group_args
  };
}

export async function plan_queries(
  configuration: Configuration,
  query: QueryRequest
): Promise<SQLQuery[]> {
  if (configuration.config === null || configuration.config === undefined) {
    throw new Forbidden("Connector is not properly configured", {});
  }
  let collection_alias: string = configuration.config.collection_aliases[query.collection];

  const buildQueryWithVariables = (variables: QueryVariables) => build_query(
    configuration,
    query,
    collection_alias,
    query.query,
    [],
    variables,
    [],
    [],
    [],
    null,
    query.collection_relationships,
    configuration.config!.collection_aliases
  );
  return query.variables ? await Promise.all(query.variables.map(buildQueryWithVariables)) : [buildQueryWithVariables({})];
}

async function do_all(con: any, sql: string, args: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    con.all(sql, ...args, function (err: any, res: any) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

async function perform_query(
  state: State,
  query_plans: SQLQuery[]
): Promise<QueryResponse> {
  const response: RowSet[] = [];
  for (let query_plan of query_plans) {
    try {
      const connection = state.client.connect();
      let row_set: RowSet = {};  // Start with empty object 
      
      if (query_plan.runSql) {
        const res = await do_all(connection, query_plan.sql, query_plan.args);
        const regular_results = JSON.parse(res[0]["data"]);
        row_set.rows = regular_results.rows;
      }

      if (query_plan.runAgg) {
        const res = await do_all(connection, query_plan.aggSql, query_plan.aggArgs);
        const parsedAggData = JSON.parse(res[0]["data"]);
        row_set.aggregates = parsedAggData;
      }

      if (query_plan.runGroup) {
        const res = await do_all(connection, query_plan.groupSql, query_plan.groupArgs);
        const parsedGroupData = JSON.parse(res[0]["data"]);
        row_set.groups = parsedGroupData;
      }

      if (!query_plan.runSql && !query_plan.runAgg && !query_plan.runGroup){
        throw new Forbidden("Must run something 😭", {});
      }

      response.push(row_set);
      connection.close();
    } catch (err) {
      console.error("Error performing query: " + err);
      throw err;
    }
  }
  // console.log(JSON.stringify(response, null, 4));
  return response;
}

export async function do_query(
  configuration: Configuration,
  state: State,
  query: QueryRequest
): Promise<QueryResponse> {
  // console.log(JSON.stringify(query, null, 4));
  let query_plans = await plan_queries(configuration, query);
  // throw new Forbidden("OK", {});
  return await perform_query(state, query_plans);
}
