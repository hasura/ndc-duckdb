import { NotSupported, ObjectType } from '@hasura/ndc-sdk-typescript';
import { RawConfiguration } from "..";
import { DUCKDB_CONFIG } from "../constants";
import * as duckdb from 'duckdb';

const determine_type = (t: string): string => {
  switch (t) {
      case "BIGINT":
          return "Int";
      case "BIT":
          return "String";
      case "BOOLEAN":
          return "Boolean";
      case "BLOB":
          return "String";
      case "DATE":
          return "String";
      case "DOUBLE":
          return "Float";
      case "HUGEINT":
          return "String";
      case "INTEGER":
          return "Int";
      case "INTERVAL":
          return "String";
      case "REAL":
          return "Float";
      case "FLOAT":
          return "Float";
      case "SMALLINT":
          return "Int";
      case "TIME":
          return "String";
      case "TIMESTAMP":
          return "String";
      case "TIMESTAMP WITH TIME ZONE":
          return "String";
      case "TINYINT":
          return "Int";
      case "UBIGINT":
          return "String";
      case "UINTEGER":
          return "Int";
      case "USMALLINT":
          return "Int";
      case "UTINYINT":
          return "Int";
      case "UUID":
          return "String";
      case "VARCHAR":
          return "String";
      default:
          if (t.startsWith("DECIMAL")){
              return "Float";
          }
          throw new NotSupported("Unsupported type", {});
  }
};

async function query_all(con: any, query: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
      con.all(query, function(err: any, res: any){
          if (err){
              reject(err);
          } else {
              resolve(res);
          }
      })
  })
};


export async function do_update_configuration(
  configuration: RawConfiguration
): Promise<RawConfiguration> {
    const db = new duckdb.Database(configuration.credentials.url, DUCKDB_CONFIG);
    const con = db.connect();
    const table_names: string[] = [];
    const table_aliases: {[k: string]: string} = {};
    const object_types: { [k: string]: ObjectType } = {};
    const tables = await query_all(con, "SHOW ALL TABLES");
    for (let table of tables){
        const table_name = `${table.database}_${table.schema}_${table.name}`;
        const alias_name = `${table.database}.${table.schema}.${table.name}`;
        table_names.push(table_name);
        table_aliases[table_name] = alias_name;
        if (!object_types[table_name]){
            object_types[table_name] = {
                fields: {}
            };
        }
        for (let i = 0; i < table.column_names.length; i++){
            object_types[table_name]['fields'][table.column_names[i]] = {
                type: {
                    type: "named",
                    name: determine_type(table.column_types[i])
                }
            }
        }
    }
    if (!configuration.config){
      configuration.config = {
        collection_names: table_names,
        collection_aliases: table_aliases,
        object_types: object_types,
        functions: [],
        procedures: []
      }
    }
    return configuration;
}
