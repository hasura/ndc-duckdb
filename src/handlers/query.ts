import {
  QueryRequest,
  QueryResponse,
  Expression,
  BadRequest,
  Query,
  InternalServerError,
  NotSupported,
  RowSet,
} from "@hasura/ndc-sdk-typescript";
import { Configuration } from "..";
import * as duckdb from "duckdb";
const SqlString = require("sqlstring-sqlite");
import { format } from "sql-formatter";
import { DUCKDB_CONFIG, MAX_32_INT } from "../constants";

const escape_single = (s: any) => SqlString.escape(s);
const escape_double = (s: any) => `"${SqlString.escape(s).slice(1, -1)}"`;
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
    JSON_OBJECT('rows', JSON_GROUP_ARRAY(JSON(r)))
  FROM
    (
      ${s}
    )
  `;
}

function build_where(
  expression: Expression,
  args: any[],
  variables: QueryVariables
): string {
  let sql = "";
  switch (expression.type) {
    case "unary_comparison_operator":
      switch (expression.operator) {
        case "is_null":
          sql = `${expression.column.name} IS NULL`;
          break;
        default:
          throw new BadRequest("Unknown Unary Comparison Operator", {
            "Unknown Operator": "This should never happen.",
          });
      }
      break;
    case "binary_comparison_operator":
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
          throw new BadRequest("Not implemented", {});
        default:
          throw new BadRequest("Unknown Binary Comparison Value Type", {});
      }
      switch (expression.operator.type) {
        case "equal":
          sql = `${expression.column.name} = ?`;
          break;
        case "other":
          switch (expression.operator.name) {
            case "_like":
              // TODO: Should this be setup like this? Or is this wrong because the % wildcard matches should be set by user?
              // I.e. Should we let the user pass through their own % to more closely follow the sqlite spec, and create a new operator..
              // _contains => That does the LIKE %match%
              args[args.length - 1] = `%${args[args.length - 1]}%`;
              sql = `${expression.column.name} LIKE ?`;
              break;
            case "_glob":
              sql = `${expression.column.name} GLOB ?`;
              break;
            case "_neq":
              sql = `${expression.column.name} != ?`;
              break;
            case "_gt":
              sql = `${expression.column.name} > ?`;
              break;
            case "_lt":
              sql = `${expression.column.name} < ?`;
              break;
            case "_gte":
              sql = `${expression.column.name} >= ?`;
              break;
            case "_lte":
              sql = `${expression.column.name} <= ?`;
              break;
            default:
              throw new NotSupported("Invalid Expression Operator Name", {});
          }
          break;
        default:
          throw new BadRequest(
            "Binary Comparison Custom Operator not implemented",
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
          const res = build_where(expr, args, variables);
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
          const res = build_where(expr, args, variables);
          clauses.push(res);
        }
        sql = `(${clauses.join(` OR `)})`;
      }
      break;
    case "not":
      const not_result = build_where(expression.expression, args, variables);
      sql = `NOT (${not_result})`;
      break;
    case "binary_array_comparison_operator":
      // IN
      throw new BadRequest("In not implemented", {});
    case "exists":
      // EXISTS
      throw new BadRequest("Not implemented", {});
    default:
      throw new BadRequest("Unknown Expression Type!", {});
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
  agg_args: any[]
): SQLQuery {
  if (config.config === null || config.config === undefined) {
    throw new BadRequest("Must supply config", {});
  }
  let sql = "";
  let agg_sql = "";
  let run_sql = false;
  let run_agg = false;
  path.push(collection);
  let collection_alias = path.join("_");
  // let indent = "    ".repeat(path.length - 1);

  let limit_sql = ``;
  let offset_sql = ``;
  let order_by_sql = ``;
  let collect_rows = [];
  let where_conditions = ["WHERE 1"];
  if (query.aggregates) {
    // TODO: Add each aggregate to collectRows
    // Aggregates need to be handled seperately.
    run_agg = true;
    agg_sql = "... todo";
    throw new NotSupported("Aggregates not implemented yet!", {});
  }
  if (query.fields) {
    run_sql = true;
    for (let [field_name, field_value] of Object.entries(query.fields)) {
      collect_rows.push(escape_single(field_name));
      switch (field_value.type) {
        case "column":
          collect_rows.push(escape_double(field_value.column));
          break;
        case "relationship":
          collect_rows.push(
            `(${
              build_query(
                config,
                query_request,
                config.config.collection_aliases[field_value.relationship], // Lookup alias
                field_value.query,
                path,
                variables,
                args,
                agg_args
              ).sql
            })`
          );
          path.pop(); // POST-ORDER search stack pop!
          break;
        default:
          throw new InternalServerError("The types tricked me. 😭", {});
      }
    }
  }
  let from_sql = `${collection} as ${escape_double(collection_alias)}`;
  if (path.length > 1) {
    throw new NotSupported("Relationships are not supported yet.", {});
  }

  if (query.where) {
    where_conditions.push(`(${build_where(query.where, args, variables)})`);
  }

  if (query.order_by) {
    let order_elems: string[] = [];
    for (let elem of query.order_by.elements) {
      switch (elem.target.type) {
        case "column":
          order_elems.push(
            `${escape_double(elem.target.name)} ${elem.order_direction}`
          );
          break;
        case "single_column_aggregate":
          throw new NotSupported(
            "Single Column Aggregate not supported yet",
            {}
          );
        case "star_count_aggregate":
          throw new NotSupported(
            "Single Column Aggregate not supported yet",
            {}
          );
        default:
          throw new BadRequest("The types lied 😭", {});
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
  ${where_conditions.join(" AND ")}
  ${order_by_sql}
  ${limit_sql}
  ${offset_sql}
  `);

  if (path.length === 1) {
    sql = wrap_data(sql);
    console.log(format(sql, { language: "sqlite" }));
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
    throw new InternalServerError("Connector is not properly configured", {});
  }
  let collection_alias: string =
    configuration.config.collection_aliases[query.collection];
  let query_plan: SQLQuery[];
  if (query.variables) {
    let promises = query.variables.map((varSet) => {
      let query_variables: QueryVariables = varSet;
      return build_query(
        configuration,
        query,
        collection_alias,
        query.query,
        [],
        query_variables,
        [],
        []
      );
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
      []
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
  configuration: Configuration,
  query_plans: SQLQuery[]
): Promise<QueryResponse> {
  const db = new duckdb.Database(configuration.credentials.url, DUCKDB_CONFIG);
  const con = db.connect();
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
  query: QueryRequest
): Promise<QueryResponse> {
  // console.log(JSON.stringify(query, null, 4));
  let query_plans = await plan_queries(configuration, query);
  return await perform_query(configuration, query_plans);
}
