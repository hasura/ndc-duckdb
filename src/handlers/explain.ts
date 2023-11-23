import { ExplainResponse, QueryRequest } from "@hasura/ndc-sdk-typescript";
import { Configuration } from "..";

export async function do_explain(configuration: Configuration, query: QueryRequest): Promise<ExplainResponse>{
    return {
        details: {}
    };
}