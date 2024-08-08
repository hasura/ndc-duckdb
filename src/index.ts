import {
  SchemaResponse,
  ObjectType,
  FunctionInfo,
  ProcedureInfo,
  QueryRequest,
  QueryResponse,
  MutationRequest,
  MutationResponse,
  Capabilities,
  ExplainResponse,
  start,
  Connector,
  Forbidden
} from "@hasura/ndc-sdk-typescript";
import { CAPABILITIES_RESPONSE, DUCKDB_CONFIG } from "./constants";
import { do_get_schema } from "./handlers/schema";
import { do_explain } from "./handlers/explain";
import { do_query } from "./handlers/query";
import { do_mutation } from "./handlers/mutation";
import { readFileSync } from "fs";
import * as duckdb from "duckdb";

const DUCKDB_URL = process.env["DUCKDB_URL"] as string;

type ConfigurationSchema = {
  collection_names: string[];
  collection_aliases: {[k: string]: string};
  object_types: { [k: string]: ObjectType };
  functions: FunctionInfo[];
  procedures: ProcedureInfo[];
};

type CredentialSchema = {
  url: string;
};

export type Configuration = {
  config?: ConfigurationSchema;
};

export interface State {
    client: duckdb.Database
};

const connector: Connector<Configuration, State> = {

    /**
     * Validate the configuration files provided by the user, returning a validated 'Configuration',
     * or throwing an 'Error'. Throwing an error prevents Connector startup.
     * @param configuration
     */
    parseConfiguration(configurationDir: string): Promise<Configuration> {
        let filePath = `${configurationDir}/config.json`;
        if (configurationDir.length === 0){
            filePath = "config.json";
        }
        try {
        const fileContent = readFileSync(filePath, 'utf8');
        const configObject: Configuration = JSON.parse(fileContent);
        return Promise.resolve(configObject);
        } catch (error) {
        console.error("Failed to parse configuration:", error);
        throw new Forbidden(
            "Internal Server Error, server configuration is invalid",
            {}
        );
        }
    },

    /**
     * Initialize the connector's in-memory state.
     *
     * For example, any connection pools, prepared queries,
     * or other managed resources would be allocated here.
     *
     * In addition, this function should register any
     * connector-specific metrics with the metrics registry.
     * @param configuration
     * @param metrics
     */
    tryInitState(_: Configuration, __: unknown): Promise<State> {
        const credentials: CredentialSchema = {url: DUCKDB_URL};
        const client = new duckdb.Database(credentials.url, DUCKDB_CONFIG);
        return Promise.resolve({client: client});
    },

    /**
     * Get the connector's capabilities.
     *
     * This function implements the [capabilities endpoint](https://hasura.github.io/ndc-spec/specification/capabilities.html)
     * from the NDC specification.
     * @param configuration
     */
    getCapabilities(_: Configuration): Capabilities {
        return CAPABILITIES_RESPONSE;
    },

    /**
     * Get the connector's schema.
     *
     * This function implements the [schema endpoint](https://hasura.github.io/ndc-spec/specification/schema/index.html)
     * from the NDC specification.
     * @param configuration
     */
    async getSchema(configuration: Configuration): Promise<SchemaResponse> {
        if (!configuration.config) {
            throw new Forbidden(
                "Internal Server Error, server configuration is invalid",
                {}
            );
        }
        return Promise.resolve(do_get_schema(configuration));
    },

    /**
     * Explain a query by creating an execution plan
     *
     * This function implements the [explain endpoint](https://hasura.github.io/ndc-spec/specification/explain.html)
     * from the NDC specification.
     * @param configuration
     * @param state
     * @param request
     */
    queryExplain(
        configuration: Configuration,
        _: State,
        request: QueryRequest
    ): Promise<ExplainResponse> {
        if (!configuration.config) {
            throw new Forbidden(
                "Internal Server Error, server configuration is invalid",
                {}
            );
        }
        return do_explain(configuration, request);
    },

    /**
     * Explain a mutation by creating an execution plan
     * @param configuration
     * @param state
     * @param request
     */
    mutationExplain(
        configuration: Configuration,
        _: State,
        request: MutationRequest
    ): Promise<ExplainResponse> {
        if (!configuration.config) {
        throw new Forbidden(
            "Internal Server Error, server configuration is invalid",
            {}
        );
        }
        throw new Forbidden("Not implemented", {});
    },

    /**
     * Execute a query
     *
     * This function implements the [query endpoint](https://hasura.github.io/ndc-spec/specification/queries/index.html)
     * from the NDC specification.
     * @param configuration
     * @param state
     * @param request
     */
    query(
        configuration: Configuration,
        state: State,
        request: QueryRequest
    ): Promise<QueryResponse> {
        if (!configuration.config) {
            throw new Forbidden(
                "Internal Server Error, server configuration is invalid",
                {}
            );
        }
        return do_query(configuration, state, request);
    },

    /**
     * Execute a mutation
     *
     * This function implements the [mutation endpoint](https://hasura.github.io/ndc-spec/specification/mutations/index.html)
     * from the NDC specification.
     * @param configuration
     * @param state
     * @param request
     */
    mutation(
        configuration: Configuration,
        _: State,
        request: MutationRequest
    ): Promise<MutationResponse> {
        return do_mutation(configuration, request);
    },

    /**
     * Check the health of the connector.
     *
     * For example, this function should check that the connector
     * is able to reach its data source over the network.
     * @param configuration
     * @param state
     */
    getHealthReadiness(_: Configuration, __: State): Promise<undefined> {
        return Promise.resolve(undefined);
    },

    /**
     *
     * Update any metrics from the state
     *
     * Note: some metrics can be updated directly, and do not
     * need to be updated here. This function can be useful to
     * query metrics which cannot be updated directly, e.g.
     * the number of idle connections in a connection pool
     * can be polled but not updated directly.
     * @param configuration
     * @param state
     */
    fetchMetrics(_: Configuration, __: State): Promise<undefined> {
        return Promise.resolve(undefined);
    },
};

start(connector);
