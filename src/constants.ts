import { CapabilitiesResponse, ScalarType } from "@hasura/ndc-sdk-typescript";
import { JSONSchemaObject } from "@json-schema-tools/meta-schema";

export const CAPABILITIES_RESPONSE: CapabilitiesResponse = {
  version: "^0.1.0",
  capabilities: {
    query: {
      variables: {}
    },
    mutation: {
      transactional: null,
      explain: null
    },
    relationships: {
      order_by_aggregate: {},
      relation_comparisons: {}
    }
  },
};
export const MAX_32_INT: number = 2147483647;
export const SCALAR_TYPES: { [key: string]: ScalarType } = {
  Int: {
    aggregate_functions: {
      // sum: {
      //   result_type: {
      //     type: "named",
      //     name: "Int"
      //   }
      // }
    },
    comparison_operators: {
      _eq: {
        type: "equal"
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
    }
  },
  Float: {
    aggregate_functions: {
      // sum: {
      //   result_type: {
      //     type: "named",
      //     name: "Float"
      //   }
      // }
    },
    comparison_operators: {
      _eq: {
        type: "equal"
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
    }
  },
  String: {
    aggregate_functions: {},
    comparison_operators: {
      _eq: {
        type: "equal"
      },
      _like: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _glob: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "String",
        },
      },
    }
  },
  Boolean: {
    aggregate_functions: {},
    comparison_operators: {
      _eq: {
        type: "equal"
      },
    },
  }
};
export const DUCKDB_CONFIG = {
  'custom_user_agent': 'hasura'
}