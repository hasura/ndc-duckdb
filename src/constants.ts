import { Capabilities, ScalarType } from "@hasura/ndc-sdk-typescript";
// import { JSONSchemaObject } from "@json-schema-tools/meta-schema";

export const CAPABILITIES_RESPONSE: Capabilities = {
    query: {
      variables: {},
      aggregates: {
        group_by: {
          filter: {},
          order: {},
          paginate: {}
        }
      }
    },
    mutation: {
      transactional: null,
      explain: null
    },
    relationships: {
      order_by_aggregate: {},
      relation_comparisons: {}
    }
};
export const MAX_32_INT: number = 2147483647;
export const SCALAR_TYPES: { [key: string]: ScalarType } = {
  BigInt: {
    representation: {
      type: "biginteger"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigInt"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max",
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
    },
    comparison_operators: {
      _eq: {
        type: "equal",
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigInt",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigInt",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigInt",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigInt",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigInt",
        },
      },
    },
  },
  UBigInt: {
    representation: {
      type: "biginteger"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "UBigInt"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max"
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
    },
    comparison_operators: {
      _eq: { type: "equal" },
      _gt: { type: "custom", argument_type: { type: "named", name: "UBigInt" }},
      _lt: { type: "custom", argument_type: { type: "named", name: "UBigInt" }},
      _gte: { type: "custom", argument_type: { type: "named", name: "UBigInt" }},
      _lte: { type: "custom", argument_type: { type: "named", name: "UBigInt" }},
      _neq: { type: "custom", argument_type: { type: "named", name: "UBigInt" }},
    },
  },
  HugeInt: {
    representation: {
      type: "biginteger"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "HugeInt"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max"
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
    },
    comparison_operators: {
      _eq: { type: "equal" },
      _gt: { type: "custom", argument_type: { type: "named", name: "HugeInt" }},
      _lt: { type: "custom", argument_type: { type: "named", name: "HugeInt" }},
      _gte: { type: "custom", argument_type: { type: "named", name: "HugeInt" }},
      _lte: { type: "custom", argument_type: { type: "named", name: "HugeInt" }},
      _neq: { type: "custom", argument_type: { type: "named", name: "HugeInt" }},
    },
  },
  UHugeInt: {
    representation: {
      type: "biginteger"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "UHugeInt"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max"
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
    },
    comparison_operators: {
      _eq: { type: "equal" },
      _gt: { type: "custom", argument_type: { type: "named", name: "UHugeInt" }},
      _lt: { type: "custom", argument_type: { type: "named", name: "UHugeInt" }},
      _gte: { type: "custom", argument_type: { type: "named", name: "UHugeInt" }},
      _lte: { type: "custom", argument_type: { type: "named", name: "UHugeInt" }},
      _neq: { type: "custom", argument_type: { type: "named", name: "UHugeInt" }},
    },
  },
  Timestamp: {
    representation: {
      type: "timestamp"
    },
    aggregate_functions: {},
    comparison_operators: {
      _eq: {
        type: "equal",
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Timestamp",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Timestamp",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Timestamp",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Timestamp",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "Timestamp",
        },
      },
    },
  },
  TimestampTz: {
    representation: {
      type: "timestamptz"
    },
    aggregate_functions: {},
    comparison_operators: {
      _eq: {
        type: "equal",
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "TimestampTz",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "TimestampTz",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "TimestampTz",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "TimestampTz",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "TimestampTz",
        },
      },
    },
  },
  Int: {
    representation: {
      type: "int64"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigInt"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max"
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
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
    representation: {
      type: "float64"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max"
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
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
    representation: {
      type: "string"
    },
    aggregate_functions: {
      _group_concat: {
        type: "custom",
        result_type: {
          type: "named",
          name: "String"
        }
      },
      _group_concat_distinct: {
        type: "custom",
        result_type: {
          type: "named",
          name: "String"
        }
      },
      _group_concat_include_nulls: {
        type: "custom",
        result_type: {
          type: "named",
          name: "String"
        }
      }
    },
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
    representation: {
      type: "boolean"
    },
    aggregate_functions: {},
    comparison_operators: {
      _eq: {
        type: "equal"
      },
    },
  },
  BigDecimal: {
    representation: {
      type: "bigdecimal"
    },
    aggregate_functions: {
      _sum: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _avg: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _max: {
        type: "max"
      },
      _min: {
        type: "min"
      },
      _stddev: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _stddev_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _variance: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_samp: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      },
      _var_pop: {
        type: "custom",
        result_type: {
          type: "named",
          name: "BigDecimal"
        }
      }
    },
    comparison_operators: {
      _eq: {
        type: "equal",
      },
      _gt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigDecimal",
        },
      },
      _lt: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigDecimal",
        },
      },
      _gte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigDecimal",
        },
      },
      _lte: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigDecimal",
        },
      },
      _neq: {
        type: "custom",
        argument_type: {
          type: "named",
          name: "BigDecimal",
        },
      },
    },
  },
};
export const DUCKDB_CONFIG = {
  'custom_user_agent': 'hasura'
}