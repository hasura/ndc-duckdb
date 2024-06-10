# Querying Example

Hasura instrospects the database and allows for Querying a pre-existing DuckDB database.

If you want to try these queries out yourself, please see [this supergraph](https://github.com/hasura/super_supergraph/tree/main).

These examples use [this DuckDB file](https://github.com/hasura/super_supergraph/blob/main/duckdb/connector/duckdb/chinook.db) which contains data from the Chinook Music database.

Fetch all Albums

```graphql
query Query {
  duckdb_chinookMainAlbum {
    albumId
    artistId
    title
  }
}
```

Fetch all Albums where Album ID = 1

```graphql
query Query {
  duckdb_chinookMainAlbum(where: {albumId: {_eq: 1}}) {
    albumId
    artistId
    title
  }
}
```

Fetch all Albums order by Title

```graphql
query Query {
  duckdb_chinookMainAlbum(order_by: {title: Asc}) {
    albumId
    artistId
    title
  }
}
```

The DuckDB connector takes advantage of duck-typing to add relationships. When you add a relationship in your Hasura metadata, Hasura will assume that the relationships exist and generate SQL that includes JOIN's and also enables filtering across joins.

By adding some relationships in the HML:

```
---
kind: Relationship
version: v1
definition:
  name: artist
  source: ChinookMainAlbum
  target:
    model:
      name: ChinookMainArtist
      relationshipType: Object
  mapping:
    - source:
        fieldPath:
          - fieldName: artistId
      target:
        modelField:
          - fieldName: artistId

---
kind: Relationship
version: v1
definition:
  name: tracks
  source: ChinookMainAlbum
  target:
    model:
      name: ChinookMainTrack
      relationshipType: Array
  mapping:
    - source:
        fieldPath:
          - fieldName: albumId
      target:
        modelField:
          - fieldName: albumId

```

We can now query with relationships:

```graphql
query Query {
  duckdb_chinookMainAlbum {
    albumId
    artistId
    title
    artist {
      artistId
      name
    }
    tracks {
      albumId
      trackId
      name
    }
  }
}
```

You can also filter across relationships as well:

```graphql
query Query {
  duckdb_chinookMainAlbum(where: {artist: {artistId: {_eq: 10}}}) {
    albumId
    artistId
    title
    artist {
      artistId
      name
    }
  }
}
```

### Additional Querying Capabilities that will be coming in the future

* Aggregations
* GroupBy