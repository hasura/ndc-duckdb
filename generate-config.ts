import { NotSupported, ObjectType } from '@hasura/ndc-sdk-typescript';
import { Configuration } from './src';
import * as duckdb from 'duckdb';
import * as fs from 'fs';
import { promisify } from "util";
const writeFile = promisify(fs.writeFile);
const DEFAULT_URL = "md:?motherduck_token=ey...";
const DEFAULT_OUTPUT_FILENAME = "configuration.json";
const db = new duckdb.Database(DEFAULT_URL);
const con = db.connect();

const determineType = (t: string): string => {
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

async function queryAll(con: any, query: any): Promise<any[]> {
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

async function main() {
    const tableNames: string[] = [];
    const tableAliases: {[k: string]: string} = {};
    const objectTypes: { [k: string]: ObjectType } = {};
    const tables = await queryAll(con, "SHOW ALL TABLES");
    for (let table of tables){
        const tableName = `${table.database}_${table.schema}_${table.name}`;
        const aliasName = `${table.database}.${table.schema}.${table.name}`;
        tableNames.push(tableName);
        tableAliases[tableName] = aliasName;
        if (!objectTypes[tableName]){
            objectTypes[tableName] = {
                fields: {}
            };
        }
        for (let i = 0; i < table.column_names.length; i++){
            objectTypes[tableName]['fields'][table.column_names[i]] = {
                type: {
                    type: "named",
                    name: determineType(table.column_types[i])
                }
            }
        }
    }
    const res: Configuration = {
        credentials: {
            url: DEFAULT_URL
        },
        config: {
            collection_names: tableNames,
            collection_aliases: tableAliases,
            object_types: objectTypes,
            functions: [],
            procedures: []
        }
    };
    await writeFile(DEFAULT_OUTPUT_FILENAME, JSON.stringify(res));
};

main();

