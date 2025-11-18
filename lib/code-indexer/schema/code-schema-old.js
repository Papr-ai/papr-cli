/**
 * Code Graph Schema for PAPR Memory
 * Defines the custom schema with 10 node types and 20 relationships
 * Based on the comprehensive schema design in docs/code-indexing-deep-dive.md
 */

const CODE_SCHEMA = {
  name: "CodeGraph_v1",
  description: "Semantic code graph with functions, classes, imports, and relationships for advanced code introspection",
  status: "active",

  // Node Types (10/10 limit)
  node_types: [
    // 1. File Node
    {
      name: "File",
      label: "File",
      description: "Source code file (Python, JS, Java, etc.)",
      properties: [
        {
          name: "path",
          type: "string",
          required: true,
          description: "Absolute or relative file path"
        },
        {
          name: "language",
          type: "string",
          required: true,
          description: "Programming language (python, javascript, typescript, etc.)"
        },
        {
          name: "size",
          type: "integer",
          required: false,
          description: "File size in bytes"
        },
        {
          name: "hash",
          type: "string",
          required: false,
          description: "Content hash (MD5) for change detection"
        },
        {
          name: "lastModified",
          type: "datetime",
          required: false,
          description: "Last modification timestamp"
        }
      ],
      required_properties: ["path", "language"],
      unique_identifiers: ["path"]
    },

    // 2. Function Node
    {
      name: "Function",
      label: "Function",
      description: "Function or method definition (language-agnostic)",
      properties: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "Function name"
        },
        {
          name: "signature",
          type: "string",
          required: false,
          description: "Full function signature with parameters"
        },
        {
          name: "language",
          type: "string",
          required: true,
          description: "Programming language"
        },
        {
          name: "startLine",
          type: "integer",
          required: true,
          description: "Starting line number in file"
        },
        {
          name: "endLine",
          type: "integer",
          required: true,
          description: "Ending line number in file"
        },
        {
          name: "complexity",
          type: "integer",
          required: false,
          description: "Cyclomatic complexity score"
        },
        {
          name: "async",
          type: "boolean",
          required: false,
          description: "Is async/await function"
        }
      ],
      required_properties: ["name", "language", "startLine", "endLine"],
      unique_identifiers: ["name", "signature"]
    },

    // 3. Class Node
    {
      name: "Class",
      label: "Class",
      description: "Class, interface, or type definition (language-agnostic)",
      properties: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "Class name"
        },
        {
          name: "language",
          type: "string",
          required: true,
          description: "Programming language"
        },
        {
          name: "isAbstract",
          type: "boolean",
          required: false,
          description: "Is abstract class or interface"
        },
        {
          name: "startLine",
          type: "integer",
          required: true,
          description: "Starting line number"
        },
        {
          name: "endLine",
          type: "integer",
          required: true,
          description: "Ending line number"
        }
      ],
      required_properties: ["name", "language", "startLine", "endLine"],
      unique_identifiers: ["name"]
    },

    // 4. Variable Node
    {
      name: "Variable",
      label: "Variable",
      description: "Variable declaration or parameter",
      properties: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "Variable name"
        },
        {
          name: "type",
          type: "string",
          required: false,
          description: "Variable type annotation"
        },
        {
          name: "scope",
          type: "string",
          required: true,
          enum_values: ["global", "local", "parameter", "field"],
          description: "Variable scope"
        },
        {
          name: "language",
          type: "string",
          required: true,
          description: "Programming language"
        },
        {
          name: "line",
          type: "integer",
          required: true,
          description: "Declaration line number"
        }
      ],
      required_properties: ["name", "scope", "language", "line"],
      unique_identifiers: ["name", "scope"]
    },

    // 5. Import Node
    {
      name: "Import",
      label: "Import",
      description: "Import/require/include statement",
      properties: [
        {
          name: "moduleName",
          type: "string",
          required: true,
          description: "Imported module name"
        },
        {
          name: "importedNames",
          type: "array",
          required: false,
          description: "Specific imported symbols (for selective imports)"
        },
        {
          name: "isWildcard",
          type: "boolean",
          required: false,
          description: "Is wildcard import (e.g., import *)"
        },
        {
          name: "alias",
          type: "string",
          required: false,
          description: "Import alias (e.g., as np)"
        },
        {
          name: "line",
          type: "integer",
          required: true,
          description: "Import statement line number"
        }
      ],
      required_properties: ["moduleName", "line"],
      unique_identifiers: ["moduleName"]
    },

    // 6. Export Node
    {
      name: "Export",
      label: "Export",
      description: "Exported symbol from a module",
      properties: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "Export name"
        },
        {
          name: "type",
          type: "string",
          required: true,
          enum_values: ["function", "class", "variable", "default"],
          description: "Export type"
        },
        {
          name: "isDefault",
          type: "boolean",
          required: false,
          description: "Is default export"
        }
      ],
      required_properties: ["name", "type"],
      unique_identifiers: ["name"]
    },

    // 7. CallSite Node
    {
      name: "CallSite",
      label: "CallSite",
      description: "Function call location (for precise call graph tracking)",
      properties: [
        {
          name: "calleeName",
          type: "string",
          required: true,
          description: "Called function name"
        },
        {
          name: "line",
          type: "integer",
          required: true,
          description: "Call line number"
        },
        {
          name: "argumentCount",
          type: "integer",
          required: false,
          description: "Number of arguments passed"
        },
        {
          name: "isChained",
          type: "boolean",
          required: false,
          description: "Is part of method chain"
        }
      ],
      required_properties: ["calleeName", "line"]
    },

    // 8. Decorator Node
    {
      name: "Decorator",
      label: "Decorator",
      description: "Decorator/annotation (Python, TypeScript, Java)",
      properties: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "Decorator name"
        },
        {
          name: "arguments",
          type: "array",
          required: false,
          description: "Decorator arguments"
        },
        {
          name: "line",
          type: "integer",
          required: true,
          description: "Decorator line number"
        }
      ],
      required_properties: ["name", "line"],
      unique_identifiers: ["name"]
    },

    // 9. Comment Node
    {
      name: "Comment",
      label: "Comment",
      description: "Comment or documentation string",
      properties: [
        {
          name: "text",
          type: "string",
          required: true,
          description: "Comment text content"
        },
        {
          name: "type",
          type: "string",
          required: true,
          enum_values: ["line", "block", "docstring"],
          description: "Comment type"
        },
        {
          name: "startLine",
          type: "integer",
          required: true,
          description: "Starting line number"
        },
        {
          name: "endLine",
          type: "integer",
          required: false,
          description: "Ending line number (for block comments)"
        }
      ],
      required_properties: ["text", "type", "startLine"]
    },

    // 10. Package Node
    {
      name: "Package",
      label: "Package",
      description: "External package dependency",
      properties: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "Package name"
        },
        {
          name: "version",
          type: "string",
          required: false,
          description: "Package version"
        },
        {
          name: "type",
          type: "string",
          required: true,
          enum_values: ["npm", "pip", "maven", "gem", "cargo"],
          description: "Package manager type"
        }
      ],
      required_properties: ["name", "type"],
      unique_identifiers: ["name", "version"]
    }
  ],

  // Relationship Types (20/20 limit)
  relationship_types: [
    {
      name: "DEFINED_IN",
      label: "Defined In",
      description: "Symbol is defined in this file",
      allowed_source_types: ["Function", "Class", "Variable", "Import", "Export", "CallSite", "Decorator", "Comment"],
      allowed_target_types: ["File"]
    },
    {
      name: "CALLS",
      label: "Calls",
      description: "Function calls another function",
      allowed_source_types: ["Function", "CallSite"],
      allowed_target_types: ["Function"]
    },
    {
      name: "CALLED_BY",
      label: "Called By",
      description: "Reverse of CALLS (for bidirectional queries)",
      allowed_source_types: ["Function"],
      allowed_target_types: ["Function", "CallSite"]
    },
    {
      name: "EXTENDS",
      label: "Extends",
      description: "Class inheritance relationship",
      allowed_source_types: ["Class"],
      allowed_target_types: ["Class"]
    },
    {
      name: "IMPLEMENTS",
      label: "Implements",
      description: "Interface implementation",
      allowed_source_types: ["Class"],
      allowed_target_types: ["Class"]
    },
    {
      name: "HAS_METHOD",
      label: "Has Method",
      description: "Class contains method",
      allowed_source_types: ["Class"],
      allowed_target_types: ["Function"]
    },
    {
      name: "HAS_FIELD",
      label: "Has Field",
      description: "Class has field or property",
      allowed_source_types: ["Class"],
      allowed_target_types: ["Variable"]
    },
    {
      name: "IMPORTS",
      label: "Imports",
      description: "File contains import statement",
      allowed_source_types: ["File"],
      allowed_target_types: ["Import"]
    },
    {
      name: "IMPORTS_FROM",
      label: "Imports From",
      description: "Import resolves to file or package",
      allowed_source_types: ["Import"],
      allowed_target_types: ["File", "Package"]
    },
    {
      name: "EXPORTS",
      label: "Exports",
      description: "File exports symbol",
      allowed_source_types: ["File"],
      allowed_target_types: ["Export"]
    },
    {
      name: "EXPORTS_SYMBOL",
      label: "Exports Symbol",
      description: "Export references a symbol",
      allowed_source_types: ["Export"],
      allowed_target_types: ["Function", "Class", "Variable"]
    },
    {
      name: "HAS_PARAMETER",
      label: "Has Parameter",
      description: "Function has parameter",
      allowed_source_types: ["Function"],
      allowed_target_types: ["Variable"]
    },
    {
      name: "USES_VARIABLE",
      label: "Uses Variable",
      description: "Function reads or writes variable",
      allowed_source_types: ["Function"],
      allowed_target_types: ["Variable"]
    },
    {
      name: "ASSIGNS_TO",
      label: "Assigns To",
      description: "Function assigns value to variable",
      allowed_source_types: ["Function"],
      allowed_target_types: ["Variable"]
    },
    {
      name: "DECORATED_WITH",
      label: "Decorated With",
      description: "Symbol has decorator or annotation",
      allowed_source_types: ["Function", "Class"],
      allowed_target_types: ["Decorator"]
    },
    {
      name: "DOCUMENTS",
      label: "Documents",
      description: "Comment documents a symbol",
      allowed_source_types: ["Comment"],
      allowed_target_types: ["Function", "Class", "File"]
    },
    {
      name: "DEPENDS_ON",
      label: "Depends On",
      description: "File depends on external package",
      allowed_source_types: ["File"],
      allowed_target_types: ["Package"]
    },
    {
      name: "TESTED_BY",
      label: "Tested By",
      description: "Symbol is tested by test function",
      allowed_source_types: ["Function", "Class"],
      allowed_target_types: ["Function"]
    },
    {
      name: "THROWS",
      label: "Throws",
      description: "Function can throw exception type",
      allowed_source_types: ["Function"],
      allowed_target_types: ["Class"]
    },
    {
      name: "REFERENCES",
      label: "References",
      description: "Generic reference relationship",
      allowed_source_types: ["Function", "Class", "Variable"],
      allowed_target_types: ["Function", "Class", "Variable"]
    }
  ]
};

module.exports = { CODE_SCHEMA };
