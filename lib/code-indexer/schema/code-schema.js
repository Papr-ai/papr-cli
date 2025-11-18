/**
 * Code Graph Schema for PAPR Memory (Corrected Format)
 * node_types and relationship_types are objects (not arrays)
 */

const CODE_SCHEMA = {
  name: "CodeGraph_v1",
  description: "Semantic code graph with functions, classes, imports, and relationships for advanced code introspection",
  status: "active",

  // Node Types - Object with node names as keys
  node_types: {
    "File": {
      name: "File",
      label: "File",
      description: "Source code file (Python, JS, Java, etc.)",
      properties: {
        "path": {
          type: "string",
          required: true,
          description: "Absolute or relative file path"
        },
        "language": {
          type: "string",
          required: true,
          description: "Programming language (python, javascript, typescript, etc.)"
        },
        "size": {
          type: "integer",
          required: false,
          description: "File size in bytes"
        },
        "hash": {
          type: "string",
          required: false,
          description: "Content hash (MD5) for change detection"
        },
        "lastModified": {
          type: "datetime",
          required: false,
          description: "Last modification timestamp"
        }
      },
      required_properties: ["path", "language"],
      unique_identifiers: ["path"]
    },

    "Function": {
      name: "Function",
      label: "Function",
      description: "Function or method definition (language-agnostic)",
      properties: {
        "name": {
          type: "string",
          required: true,
          description: "Function name"
        },
        "signature": {
          type: "string",
          required: false,
          description: "Full function signature with parameters"
        },
        "language": {
          type: "string",
          required: true,
          description: "Programming language"
        },
        "startLine": {
          type: "integer",
          required: true,
          description: "Starting line number in file"
        },
        "endLine": {
          type: "integer",
          required: true,
          description: "Ending line number in file"
        },
        "complexity": {
          type: "integer",
          required: false,
          description: "Cyclomatic complexity score"
        },
        "async": {
          type: "boolean",
          required: false,
          description: "Is async/await function"
        }
      },
      required_properties: ["name", "language", "startLine", "endLine"],
      unique_identifiers: ["name", "signature"]
    },

    "Class": {
      name: "Class",
      label: "Class",
      description: "Class, interface, or type definition (language-agnostic)",
      properties: {
        "name": {
          type: "string",
          required: true,
          description: "Class name"
        },
        "language": {
          type: "string",
          required: true,
          description: "Programming language"
        },
        "isAbstract": {
          type: "boolean",
          required: false,
          description: "Is abstract class or interface"
        },
        "startLine": {
          type: "integer",
          required: true,
          description: "Starting line number"
        },
        "endLine": {
          type: "integer",
          required: true,
          description: "Ending line number"
        }
      },
      required_properties: ["name", "language", "startLine", "endLine"],
      unique_identifiers: ["name"]
    },

    "Import": {
      name: "Import",
      label: "Import",
      description: "Import/require/include statement",
      properties: {
        "moduleName": {
          type: "string",
          required: true,
          description: "Imported module name"
        },
        "line": {
          type: "integer",
          required: true,
          description: "Import statement line number"
        },
        "isWildcard": {
          type: "boolean",
          required: false,
          description: "Is wildcard import (e.g., import *)"
        },
        "alias": {
          type: "string",
          required: false,
          description: "Import alias (e.g., as np)"
        }
      },
      required_properties: ["moduleName", "line"],
      unique_identifiers: ["moduleName"]
    }
  },

  // Relationship Types - Object with relationship names as keys
  relationship_types: {
    "DEFINED_IN": {
      name: "DEFINED_IN",
      label: "Defined In",
      description: "Symbol is defined in this file",
      allowed_source_types: ["Function", "Class", "Import"],
      allowed_target_types: ["File"]
    },

    "CALLS": {
      name: "CALLS",
      label: "Calls",
      description: "Function calls another function",
      allowed_source_types: ["Function"],
      allowed_target_types: ["Function"]
    },

    "EXTENDS": {
      name: "EXTENDS",
      label: "Extends",
      description: "Class inheritance relationship",
      allowed_source_types: ["Class"],
      allowed_target_types: ["Class"]
    },

    "IMPORTS": {
      name: "IMPORTS",
      label: "Imports",
      description: "File contains import statement",
      allowed_source_types: ["File"],
      allowed_target_types: ["Import"]
    },

    "HAS_METHOD": {
      name: "HAS_METHOD",
      label: "Has Method",
      description: "Class contains method",
      allowed_source_types: ["Class"],
      allowed_target_types: ["Function"]
    }
  }
};

module.exports = { CODE_SCHEMA };
