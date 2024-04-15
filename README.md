## DuckDB Connector

The DuckDB Data Connector allows for connecting to a Motherduck hosted DuckDB database, or a local DuckDB database file. This connector uses the [Typescript Data Connector SDK](https://github.com/hasura/ndc-sdk-typescript) and implements the [Data Connector Spec](https://github.com/hasura/ndc-spec). 

This connector currently only supports querying.

### Setting up the DuckDB connector using Hasura Cloud & MotherDuck

#### Step 1: Prerequisites

1. Install the [new Hasura CLI](https://hasura.io/docs/3.0/cli/installation/) — to quickly and easily create and manage your Hasura projects and builds.
2. Install the [Hasura VS Code extension](https://marketplace.visualstudio.com/items?itemName=HasuraHQ.hasura) — with support for other editors coming soon!
3. Have a [MotherDuck](https://motherduck.com/) hosted DuckDB database — for supplying data to your API.

#### Step 2: Login to Hasura

After our prerequisites are taken care of, login to Hasura Cloud with the CLI:

`ddn login`

This will open up a browser window and initiate an OAuth2 login flow. If the browser window doesn't open automatically, use the link shown in the terminal output to launch the flow.

#### Step 3: Create a new project

We'll use the `create project` command to create a new project:

`ddn create project --dir ./ddn`

#### Step 4: Add a connector manifest

Let's move into the project directory:

`cd ddn`

Create a subgraph:

`ddn create subgraph duckdb`

Then, create a connector manifest:
`ddn add connector-manifest duckdb_connector --subgraph duckdb --hub-connector hasura/duckdb --type cloud`

#### Step 5: Edit the connector manifest

You should have a connector manifest created at `ddn/duckdb/duckdb_connector/connector/duckdb_connector.build.hml`

```yaml
kind: ConnectorManifest
version: v1
spec:
  supergraphManifests:
    - base
definition:
  name: duckdb_connector
  type: cloud
  connector:
    type: hub
    name: hasura/duckdb:v0.0.9
  deployments:
    - context: .
      env:
        DUCKDB_URL:
          value: ""
```

Fill in the value for the DUCKDB_URL environment variable with a DuckDB connection string which looks something like this:

`md:?motherduck_token=ey`

(Make sure to save your changes to the file!)

#### Step 6: Start a development session

Start a Hasura dev session using the following command:

`ddn dev`

You should see something like this: 

```
12:10PM INF Building SupergraphManifest "base"...
+---------------+--------------------------------------------------------------------------------------------------+
| Build Version | 7e01762194                                                                                       |
+---------------+--------------------------------------------------------------------------------------------------+
| API URL       | https://pure-sparrow-2887-7e01762194.ddn.hasura.app/graphql                                      |
+---------------+--------------------------------------------------------------------------------------------------+
| Console URL   | https://console.hasura.io/project/pure-sparrow-2887/environment/default/build/7e01762194/graphql |
+---------------+--------------------------------------------------------------------------------------------------+
| Project Name  | pure-sparrow-2887                                                                                |
+---------------+--------------------------------------------------------------------------------------------------+
| Description   | Dev build - Mon, 15 Apr 2024 12:10:17 CDT                                                        |
+---------------+--------------------------------------------------------------------------------------------------+
```

Navigate to the Console URL and you can issue a query. You can use the default DuckDB example tables to issue this query for example:

```graphql
query QueryHackerNews {
  duckdb_sampleDataHnHackerNews(
    limit: 4
    where: {_or: [{text: {_like: "%Hasura%"}}, {text: {_like: "%DuckDB%"}}]}
  ) {
    text
    id
  }
}
```

And get the response:

```
{
  "data": {
    "duckdb_sampleDataHnHackerNews": [
      {
        "text": "Experimental Product? Hasura + React<p>Product with market fit and scale needs? Elixir&#x2F;Phoenix",
        "id": 31480758
      },
      {
        "text": "I just skimmed through the article tbh, but I saw 14 GB and what looked like a predicate pushdown optimization. I think DuckDB could handle that on my 16GB mac.",
        "id": 32182618
      },
      {
        "text": "To what extent does this headache go away if autogenerating graphql from a relational db, using tools like Postgraphile or Hasura? I never considered making my &quot;own&quot; graphql service but those tools sure make it look easy to create a nice API controller through db migrations.",
        "id": 31285405
      },
      {
        "text": "Under what circumtances should I prefer to use DuckDB over SQLite or PostgreSQL? It is not clear.",
        "id": 33285150
      }
    ]
  }
}
```

### Setting up the DuckDB connector locally (Coming Soon)

Please keep an eye out for instructions on running things locally which will be coming soon. 