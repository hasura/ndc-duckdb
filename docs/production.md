# Hasura DuckDB Connector in Production
We ship the DuckDB connectors as Docker images.

You can look at the Dockerfile in the root of the repository to see how the image is built.

The connector can be run via a docker-compose file:

```
services:
  duckdb_duckdb:
    build:
      context: .
      dockerfile_inline: |-
        FROM ghcr.io/hasura/ndc-duckdb:v0.0.9
        COPY ./ /etc/connector
    develop:
      watch:
        - path: ./
          action: sync+restart
          target: /etc/connector
    env_file:
      - .env.local
    extra_hosts:
      - local.hasura.dev=host-gateway
    ports:
      - mode: ingress
        target: 8080
        published: "8081"
        protocol: tcp
```