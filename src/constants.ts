import { CapabilitiesResponse, ScalarType } from "@hasura/ndc-sdk-typescript";
import { JSONSchemaObject } from "@json-schema-tools/meta-schema";

export const CAPABILITIES_RESPONSE: CapabilitiesResponse = {
  versions: "^0.1.0",
  capabilities: {
    query: {},
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
      _gt: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _lt: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _gte: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _lte: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
      _neq: {
        argument_type: {
          type: "named",
          name: "Int",
        },
      },
    },
    update_operators: {},
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
      _gt: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _lt: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _gte: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _lte: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
      _neq: {
        argument_type: {
          type: "named",
          name: "Float",
        },
      },
    },
    update_operators: {},
  },
  String: {
    aggregate_functions: {},
    comparison_operators: {
      _like: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _glob: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _gt: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _lt: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _gte: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _lte: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
      _neq: {
        argument_type: {
          type: "named",
          name: "String",
        },
      },
    },
    update_operators: {},
  },
  Boolean: {
    aggregate_functions: {},
    comparison_operators: {},
    update_operators: {},
  }
};
export const CONFIGURATION_SCHEMA: JSONSchemaObject = {
  "type": "object",
  "properties": {
    "credentials": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string"
        }
      },
      "required": [
        "url"
      ]
    },
    "config": {
      "type": "object",
      "properties": {
        "collection_names": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "collection_aliases": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          }
        },
        "object_types": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ObjectType"
          }
        },
        "functions": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/FunctionInfo"
          }
        },
        "procedures": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/ProcedureInfo"
          }
        }
      },
      "required": [
        "collection_aliases",
        "collection_names",
        "functions",
        "object_types",
        "procedures"
      ]
    }
  },
  "required": [
    "credentials"
  ],
  "definitions": {
    "ObjectType": {
      "description": "The definition of an object type",
      "type": "object",
      "properties": {
        "description": {
          "description": "Description of this type",
          "type": "string"
        },
        "fields": {
          "description": "Fields defined on this object type",
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ObjectField"
          }
        }
      },
      "required": [
        "fields"
      ]
    },
    "ObjectField": {
      "description": "The definition of an object field",
      "type": "object",
      "properties": {
        "description": {
          "description": "Description of this field",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The type of this field"
        }
      },
      "required": [
        "type"
      ]
    },
    "Type": {
      "description": "Types track the valid representations of values as JSON",
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "name": {
              "description": "The name can refer to a primitive type or a scalar type",
              "type": "string"
            },
            "type": {
              "type": "string",
              "const": "named"
            }
          },
          "required": [
            "name",
            "type"
          ]
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "const": "nullable"
            },
            "underlying_type": {
              "$ref": "#/definitions/Type",
              "description": "The type of the non-null inhabitants of this type"
            }
          },
          "required": [
            "type",
            "underlying_type"
          ]
        },
        {
          "type": "object",
          "properties": {
            "element_type": {
              "$ref": "#/definitions/Type",
              "description": "The type of the elements of the array"
            },
            "type": {
              "type": "string",
              "const": "array"
            }
          },
          "required": [
            "element_type",
            "type"
          ]
        }
      ]
    },
    "FunctionInfo": {
      "type": "object",
      "properties": {
        "arguments": {
          "description": "Any arguments that this collection requires",
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ArgumentInfo"
          }
        },
        "description": {
          "description": "Description of the function",
          "type": "string"
        },
        "name": {
          "description": "The name of the function",
          "type": "string"
        },
        "result_type": {
          "$ref": "#/definitions/Type",
          "description": "The name of the function's result type"
        }
      },
      "required": [
        "arguments",
        "name",
        "result_type"
      ]
    },
    "ArgumentInfo": {
      "type": "object",
      "properties": {
        "description": {
          "description": "Argument description",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The name of the type of this argument"
        }
      },
      "required": [
        "type"
      ]
    },
    "ProcedureInfo": {
      "type": "object",
      "properties": {
        "arguments": {
          "description": "Any arguments that this collection requires",
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ArgumentInfo"
          }
        },
        "description": {
          "description": "Column description",
          "type": "string"
        },
        "name": {
          "description": "The name of the procedure",
          "type": "string"
        },
        "result_type": {
          "$ref": "#/definitions/Type",
          "description": "The name of the result type"
        }
      },
      "required": [
        "arguments",
        "name",
        "result_type"
      ]
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
};
export const RAW_CONFIGURATION_SCHEMA: JSONSchemaObject = {
  "type": "object",
  "properties": {
    "credentials": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string"
        }
      },
      "required": [
        "url"
      ]
    },
    "config": {
      "type": "object",
      "properties": {
        "collection_names": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "collection_aliases": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          }
        },
        "object_types": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ObjectType"
          }
        },
        "functions": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/FunctionInfo"
          }
        },
        "procedures": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/ProcedureInfo"
          }
        }
      },
      "required": [
        "collection_aliases",
        "collection_names",
        "functions",
        "object_types",
        "procedures"
      ]
    }
  },
  "required": [
    "credentials"
  ],
  "definitions": {
    "ObjectType": {
      "description": "The definition of an object type",
      "type": "object",
      "properties": {
        "description": {
          "description": "Description of this type",
          "type": "string"
        },
        "fields": {
          "description": "Fields defined on this object type",
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ObjectField"
          }
        }
      },
      "required": [
        "fields"
      ]
    },
    "ObjectField": {
      "description": "The definition of an object field",
      "type": "object",
      "properties": {
        "description": {
          "description": "Description of this field",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The type of this field"
        }
      },
      "required": [
        "type"
      ]
    },
    "Type": {
      "description": "Types track the valid representations of values as JSON",
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "name": {
              "description": "The name can refer to a primitive type or a scalar type",
              "type": "string"
            },
            "type": {
              "type": "string",
              "const": "named"
            }
          },
          "required": [
            "name",
            "type"
          ]
        },
        {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "const": "nullable"
            },
            "underlying_type": {
              "$ref": "#/definitions/Type",
              "description": "The type of the non-null inhabitants of this type"
            }
          },
          "required": [
            "type",
            "underlying_type"
          ]
        },
        {
          "type": "object",
          "properties": {
            "element_type": {
              "$ref": "#/definitions/Type",
              "description": "The type of the elements of the array"
            },
            "type": {
              "type": "string",
              "const": "array"
            }
          },
          "required": [
            "element_type",
            "type"
          ]
        }
      ]
    },
    "FunctionInfo": {
      "type": "object",
      "properties": {
        "arguments": {
          "description": "Any arguments that this collection requires",
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ArgumentInfo"
          }
        },
        "description": {
          "description": "Description of the function",
          "type": "string"
        },
        "name": {
          "description": "The name of the function",
          "type": "string"
        },
        "result_type": {
          "$ref": "#/definitions/Type",
          "description": "The name of the function's result type"
        }
      },
      "required": [
        "arguments",
        "name",
        "result_type"
      ]
    },
    "ArgumentInfo": {
      "type": "object",
      "properties": {
        "description": {
          "description": "Argument description",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The name of the type of this argument"
        }
      },
      "required": [
        "type"
      ]
    },
    "ProcedureInfo": {
      "type": "object",
      "properties": {
        "arguments": {
          "description": "Any arguments that this collection requires",
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/ArgumentInfo"
          }
        },
        "description": {
          "description": "Column description",
          "type": "string"
        },
        "name": {
          "description": "The name of the procedure",
          "type": "string"
        },
        "result_type": {
          "$ref": "#/definitions/Type",
          "description": "The name of the result type"
        }
      },
      "required": [
        "arguments",
        "name",
        "result_type"
      ]
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
};
export const DUCKDB_CONFIG = {
  'custom_user_agent': 'hasura'
}