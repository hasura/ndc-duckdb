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
// import { format } from "sql-formatter";

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

const json_replacer = (key: string, value: any): any => {
  if (typeof value === "bigint") {
    return value.toString();
  } else if (typeof value === "object" && value.type === "Buffer") {
    return Buffer.from(value.data).toString();
  } else if (
    typeof value === "object" &&
    value !== null &&
    "months" in value &&
    "days" in value &&
    "micros" in value
  ) {
    // Convert to ISO 8601 duration format
    const months = value.months;
    const days = value.days;
    const total_seconds = value.micros / 1e6; // Convert microseconds to seconds
    // Construct the duration string
    let duration = "P";
    if (months > 0) duration += `${months}M`;
    if (days > 0) duration += `${days}D`;
    if (total_seconds > 0) duration += `T${total_seconds}S`;
    return duration;
  }
  return value;
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
  let collection_alias = path.join("_");

  let limit_sql = ``;
  let offset_sql = ``;
  let order_by_sql = ``;
  let collect_rows = [];
  let where_conditions = ["WHERE 1"];
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
          collect_rows.push(
            `COALESCE((
              ${
                build_query(
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
                ).sql
              }), JSON('[]')
            )`
          );
          path.pop();
          break;
        default:
          throw new Conflict("The types tricked me. 😭", {});
      }
    }
  }
  let from_sql = `${collection} as ${escape_double(collection_alias)}`;
  if (path.length > 1 && relationship_key !== null) {
    let relationship = query_request.collection_relationships[relationship_key];
    let parent_alias = path.slice(0, -1).join("_");
    let relationship_alias = config.config.collection_aliases[relationship.target_collection];
    from_sql = `${relationship_alias} as ${escape_double(collection_alias)}`;
    where_conditions.push(
      ...Object.entries(relationship.column_mapping).map(([from, to]) => {
        return `${escape_double(parent_alias)}.${escape_double(from)} = ${escape_double(collection_alias)}.${escape_double(to)}`;
      })
    );
  }

  const filter_joins: string[] = [];

  if (query.predicate) {
    where_conditions.push(`(${build_where(query.predicate, query_request.collection_relationships, args, variables, collection_alias, config.config.collection_aliases, config, query_request)})`);
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
    let agg_columns: string[] = [];
    let agg_where_conditions = ["WHERE 1"];
  
    if (path.length > 1 && relationship_key !== null) {
      let relationship = query_request.collection_relationships[relationship_key];
      let parent_alias = path.slice(0, -1).join("_");
      agg_where_conditions.push(
        ...Object.entries(relationship.column_mapping).map(([from, to]) => {
          return `${escape_double(parent_alias)}.${escape_double(from)} = ${escape_double(collection_alias)}.${escape_double(to)}`;
        })
      );
    }
  
    if (query.predicate) {
      agg_where_conditions.push(
        `(${build_where(
          query.predicate,
          query_request.collection_relationships,
          agg_args,
          variables,
          collection_alias,
          config.config?.collection_aliases || {},
          config,
          query_request
        )})`
      );
    }
  
    for (const [agg_name, agg_value] of Object.entries(query.aggregates)) {
      if (agg_value.type === "star_count") {
        agg_columns.push(`COUNT(*) as ${escape_double(agg_name)}`);
      } else if (agg_value.type === "column_count") {
        const column = `subq.${escape_double(agg_value.column)}`;
        const column_expr = agg_value.distinct
          ? `COUNT(DISTINCT ${column})`
          : `COUNT(${column})`;
        agg_columns.push(`${column_expr} as ${escape_double(agg_name)}`);
      } else if (agg_value.type === "single_column") {
        const column = `subq.${escape_double(agg_value.column)}`;
        switch (agg_value.function) {
          case "_sum":
            agg_columns.push(`SUM(${column}) as ${escape_double(agg_name)}`);
            break;
          case "_avg":
            agg_columns.push(`AVG(${column}) as ${escape_double(agg_name)}`);
            break;
          case "_max":
            agg_columns.push(`MAX(${column}) as ${escape_double(agg_name)}`);
            break;
          case "_min":
            agg_columns.push(`MIN(${column}) as ${escape_double(agg_name)}`);
            break;
          case "_stddev":
            case "_stddev_samp":
              const stdevSampleFormula = `SQRT(
                (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
                / (COUNT(*) * (COUNT(*) - 1))
              )`;
              agg_columns.push(`${stdevSampleFormula} as ${escape_double(agg_name)}`);
              break;
            case "_stddev_pop":
              const stdevPopFormula = `SQRT(
                (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
                / (COUNT(*) * COUNT(*))
              )`;
              agg_columns.push(`${stdevPopFormula} as ${escape_double(agg_name)}`);
              break;
            case "_variance":
            case "_var_samp":
              const varianceSampleFormula = `(
                (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
                / (COUNT(*) * (COUNT(*) - 1))
              )`;
              agg_columns.push(`${varianceSampleFormula} as ${escape_double(agg_name)}`);
              break;
            case "_var_pop":
              const variancePopFormula = `(
                (COUNT(*) * SUM(POWER(CAST(${column} AS REAL), 2)) - POWER(SUM(CAST(${column} AS REAL)), 2))
                / (COUNT(*) * COUNT(*))
              )`;
              agg_columns.push(`${variancePopFormula} as ${escape_double(agg_name)}`);
              break;
          case "_group_concat":
            agg_columns.push(`GROUP_CONCAT(${column}) as ${escape_double(agg_name)}`);
            break;
          case "_group_concat_distinct":
            agg_columns.push(`GROUP_CONCAT(DISTINCT ${column}) as ${escape_double(agg_name)}`);
            break;
          case "_group_concat_include_nulls":
            agg_columns.push(`GROUP_CONCAT(COALESCE(${column}, 'NULL')) as ${escape_double(agg_name)}`);
            break;
          default:
            throw new Forbidden(`Unsupported aggregate function: ${agg_value.function}`, {});
        }
      }
    }
  
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
    // console.log(format(formatSQLWithArgs(sql, args), { language: "sqlite" }));
    // console.log(format(formatSQLWithArgs(agg_sql, agg_args), { language: "sqlite" }));
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
  let collection_alias: string =
    configuration.config.collection_aliases[query.collection];
  let query_plan: SQLQuery[];
  if (query.variables) {
    let promises = query.variables.map((varSet) => {
      let query_variables: QueryVariables = varSet;
      if (configuration.config){
      return build_query(
        configuration,
        query,
        collection_alias,
        query.query,
        [],
        query_variables,
        [],
        [],
        [],
        null,
        query.collection_relationships,
        configuration.config.collection_aliases
      );
      } else {
        throw new Forbidden("Config must be defined", {});
      }
    });
    query_plan = await Promise.all(promises);
  } else {
    let promise = build_query(
      configuration,
      query,
      collection_alias,
      query.query,
      [],
      {},
      [],
      [],
      [],
      null,
      query.collection_relationships,
      configuration.config.collection_aliases
    );
    query_plan = [promise];
  }
  return query_plan;
}

async function do_all(con: any, query: SQLQuery): Promise<any[]> {
  return new Promise((resolve, reject) => {
    con.all(query.sql, ...query.args, function (err: any, res: any) {
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
        const res = await do_all(connection, {
          runSql: true,
          runAgg: false,
          runGroup: false,
          sql: query_plan.sql,
          args: query_plan.args,
          aggSql: "",
          aggArgs: [],
          groupSql: "",
          groupArgs: []
        });
        const regular_results = JSON.parse(res[0]["data"]);
        row_set.rows = regular_results.rows;
      }

      if (query_plan.runAgg) {
        const aggRes = await do_all(connection, {
          runSql: true,
          runAgg: false,
          runGroup: false,
          sql: query_plan.aggSql,
          args: query_plan.aggArgs,
          aggSql: "",
          aggArgs: [],
          groupSql: "",
          groupArgs: []
        });
        const parsedAggData = JSON.parse(aggRes[0]["data"]);
        row_set.aggregates = parsedAggData;
      }

      if (!query_plan.runSql && !query_plan.runAgg){
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
  return await perform_query(state, query_plans);
}
