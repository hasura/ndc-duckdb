//TODO: Aggregates https://github.com/hasura/ndc-duckduckapi/commit/29cacaddb811cbf0610a98a61d05a0d29da27554

import {
  QueryRequest,
  QueryResponse,
  Expression,
  Query,
  RowSet,
  Forbidden,
  Conflict,
  Relationship
} from "@hasura/ndc-sdk-typescript";
import { Configuration, State } from "..";
const SqlString = require("sqlstring-sqlite");
import { MAX_32_INT } from "../constants";
// import { format } from "sql-formatter";

const escape_single = (s: any) => SqlString.escape(s);
const escape_double = (s: any) => `"${SqlString.escape(s).slice(1, -1)}"`;

function getColumnExpression(field_def: any, collection_alias: string, column: string): string {
  // Helper function to handle the actual type
  function handleNamedType(type: any): string {
    if (type.name === "BigInt") {
      return `CAST(${escape_double(collection_alias)}.${escape_double(column)} AS TEXT)`;
    }
    return `${escape_double(collection_alias)}.${escape_double(column)}`;
  }
  // Helper function to traverse the type structure
  function processType(type: any): string {
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

function isTimestampType(field_def: any): boolean {
  if (!field_def) return false;
  
  function checkType(type: any): boolean {
    if (type.type === "nullable") {
      return checkType(type.underlying_type);
    }
    return type.type === "named" && type.name === "Timestamp";
  }
  
  return checkType(field_def.type);
}
function getIntegerType(field_def: any): string | null {
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
  sql: string;
  args: any[];
  aggSql: string;
  aggArgs: any[];
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
          args[args.length - 1] = `%${args[args.length - 1]}%`;
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
          WHERE ${predicate ? build_where(predicate, collection_relationships, args, variables, prefix, collection_aliases, config, query_request) : '1 = 1'}
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
  let run_sql = false;
  let run_agg = false;
  path.push(collection);
  let collection_alias = path.join("_");

  let limit_sql = ``;
  let offset_sql = ``;
  let order_by_sql = ``;
  let collect_rows = [];
  let where_conditions = ["WHERE 1"];
  if (query.aggregates) {
    run_agg = true;
    agg_sql = "... todo";
    throw new Forbidden("Aggregates not implemented yet!", {});
  }
  if (query.fields) {
    run_sql = true;
    for (let [field_name, field_value] of Object.entries(query.fields)) {
      collect_rows.push(escape_single(field_name));
      switch (field_value.type) {
        case "column":
          const object_type = config.config?.object_types[query_request.collection];
          const field_def = object_type.fields[field_name];
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
            order_elems.push(
              `${escape_double(collection_alias)}.${escape_double(elem.target.name)} ${elem.order_direction}`
            );
          } else {
            let currentAlias = collection_alias;
            for (let path_elem of elem.target.path) {
              const relationship = collection_relationships[path_elem.relationship];
              const nextAlias = `${currentAlias}_${relationship.target_collection}`;
              const target_collection_alias = collection_aliases[relationship.target_collection];
              const join_str = `JOIN ${target_collection_alias} AS ${escape_double(nextAlias)} ON ${Object.entries(relationship.column_mapping).map(([from, to]) => `${escape_double(currentAlias)}.${escape_double(from)} = ${escape_double(nextAlias)}.${escape_double(to)}`).join(" AND ")}`;
              if (!filter_joins.includes(join_str)) {
                filter_joins.push(join_str);
              }
              currentAlias = nextAlias;
            }
            order_elems.push(
              `${escape_double(currentAlias)}.${escape_double(elem.target.name)} ${elem.order_direction}`
            );
          }
          break;
        case "single_column_aggregate":
          throw new Forbidden(
            "Single Column Aggregate not supported yet",
            {}
          );
        case "star_count_aggregate":
          throw new Forbidden(
            "Single Column Aggregate not supported yet",
            {}
          );
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

  if (path.length === 1) {
    sql = wrap_data(sql);
    // console.log(format(formatSQLWithArgs(sql, args), { language: "sqlite" }));
  }

  return {
    runSql: run_sql,
    runAgg: run_agg,
    sql,
    args,
    aggSql: agg_sql,
    aggArgs: agg_args,
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
  const con = state.client.connect();
  const response: RowSet[] = [];
  for (let query_plan of query_plans) {
    const res = await do_all(con, query_plan);
    const row_set = JSON.parse(res[0]["data"] as string) as RowSet;
    response.push(row_set);
  }
  return response;
}

export async function do_query(
  configuration: Configuration,
  state: State,
  query: QueryRequest
): Promise<QueryResponse> {
  let query_plans = await plan_queries(configuration, query);
  return await perform_query(state, query_plans);
}
