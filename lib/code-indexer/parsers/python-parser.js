/**
 * Python Parser
 * Parses Python code using tree-sitter and extracts code entities
 */

const BaseParser = require('./base-parser');
const Python = require('tree-sitter-python');
const { generateNodeId } = require('../utils/hash-generator');

class PythonParser extends BaseParser {
  constructor() {
    super(Python, 'python');
  }

  /**
   * Extract functions from Python code
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractFunctions(tree, filePath) {
    const nodes = [];
    const relationships = [];

    // Query for function definitions
    const query = `
      (function_definition
        name: (identifier) @func_name
        parameters: (parameters) @params
        body: (block) @body
      ) @func_def
    `;

    const matches = this.query(tree, query);
    const fileNodeId = generateNodeId('File', { path: filePath });

    for (const match of matches) {
      const captures = {};
      for (const capture of match.captures) {
        captures[capture.name] = capture.node;
      }

      const funcNode = captures.func_def;
      const nameNode = captures.func_name;
      const paramsNode = captures.params;

      if (!funcNode || !nameNode) continue;

      const location = this.getNodeLocation(funcNode);
      const name = this.getNodeText(nameNode);
      const signature = paramsNode ? this.getNodeText(paramsNode) : '()';
      const fullSignature = `def ${name}${signature}`;

      // Check if async
      const isAsync = funcNode.parent?.type === 'decorated_definition' &&
                      funcNode.parent.text.includes('async');

      // Create Function node
      const functionId = generateNodeId('Function', {
        filePath,
        name,
        startLine: location.startLine
      });

      const functionNode = {
        id: functionId,
        label: 'Function',
        properties: {
          name,
          signature: fullSignature,
          language: 'python',
          startLine: location.startLine,
          endLine: location.endLine,
          async: isAsync || false
        }
      };

      nodes.push(functionNode);

      // Create DEFINED_IN relationship
      relationships.push(
        this.createRelationship(functionId, fileNodeId, 'DEFINED_IN')
      );

      // Extract function calls within this function
      const calls = await this.extractCallsFromFunction(captures.body, filePath, functionId);
      relationships.push(...calls);

      // Extract decorators if present
      if (funcNode.parent?.type === 'decorated_definition') {
        const decorators = await this.extractDecoratorsForNode(funcNode.parent, filePath, functionId);
        relationships.push(...decorators);
      }
    }

    return { nodes, relationships };
  }

  /**
   * Extract classes from Python code
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractClasses(tree, filePath) {
    const nodes = [];
    const relationships = [];

    // Query for class definitions
    const query = `
      (class_definition
        name: (identifier) @class_name
        superclasses: (argument_list)? @bases
        body: (block) @body
      ) @class_def
    `;

    const matches = this.query(tree, query);
    const fileNodeId = generateNodeId('File', { path: filePath });

    for (const match of matches) {
      const captures = {};
      for (const capture of match.captures) {
        captures[capture.name] = capture.node;
      }

      const classNode = captures.class_def;
      const nameNode = captures.class_name;
      const basesNode = captures.bases;

      if (!classNode || !nameNode) continue;

      const location = this.getNodeLocation(classNode);
      const name = this.getNodeText(nameNode);

      // Create Class node
      const classId = generateNodeId('Class', {
        filePath,
        name
      });

      const classNodeObj = {
        id: classId,
        label: 'Class',
        properties: {
          name,
          language: 'python',
          startLine: location.startLine,
          endLine: location.endLine,
          isAbstract: false  // TODO: Detect ABC
        }
      };

      nodes.push(classNodeObj);

      // Create DEFINED_IN relationship
      relationships.push(
        this.createRelationship(classId, fileNodeId, 'DEFINED_IN')
      );

      // Extract base classes (inheritance)
      if (basesNode) {
        const baseClasses = this.extractBaseClasses(basesNode);
        for (const baseClass of baseClasses) {
          // Create EXTENDS relationship (target will be resolved later)
          const baseClassId = generateNodeId('Class', { filePath: 'unknown', name: baseClass });
          relationships.push(
            this.createRelationship(classId, baseClassId, 'EXTENDS')
          );
        }
      }

      // Extract methods (functions inside class)
      const methods = await this.extractMethodsFromClass(captures.body, filePath, classId);
      relationships.push(...methods);
    }

    return { nodes, relationships };
  }

  /**
   * Extract imports from Python code
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractImports(tree, filePath) {
    const nodes = [];
    const relationships = [];
    const fileNodeId = generateNodeId('File', { path: filePath });

    // Query for import statements
    const importQuery = `
      (import_statement
        name: (dotted_name) @module
      ) @import
    `;

    const importFromQuery = `
      (import_from_statement
        module_name: (dotted_name) @module
        name: (dotted_name) @names
      ) @import_from
    `;

    // Regular imports
    const importMatches = this.query(tree, importQuery);
    for (const match of importMatches) {
      const moduleNode = match.captures.find(c => c.name === 'module')?.node;
      const importNode = match.captures.find(c => c.name === 'import')?.node;

      if (!moduleNode || !importNode) continue;

      const moduleName = this.getNodeText(moduleNode);
      const location = this.getNodeLocation(importNode);

      const importId = generateNodeId('Import', {
        filePath,
        moduleName
      });

      const importNodeObj = {
        id: importId,
        label: 'Import',
        properties: {
          moduleName,
          line: location.startLine,
          isWildcard: false
        }
      };

      nodes.push(importNodeObj);

      // IMPORTS relationship (File -> Import)
      relationships.push(
        this.createRelationship(fileNodeId, importId, 'IMPORTS')
      );
    }

    // From imports
    const importFromMatches = this.query(tree, importFromQuery);
    for (const match of importFromMatches) {
      const moduleNode = match.captures.find(c => c.name === 'module')?.node;
      const namesNode = match.captures.find(c => c.name === 'names')?.node;
      const importNode = match.captures.find(c => c.name === 'import_from')?.node;

      if (!moduleNode || !importNode) continue;

      const moduleName = this.getNodeText(moduleNode);
      const importedNames = namesNode ? [this.getNodeText(namesNode)] : [];
      const location = this.getNodeLocation(importNode);

      const importId = generateNodeId('Import', {
        filePath,
        moduleName
      });

      const importNodeObj = {
        id: importId,
        label: 'Import',
        properties: {
          moduleName,
          importedNames,
          line: location.startLine,
          isWildcard: importedNames.includes('*')
        }
      };

      nodes.push(importNodeObj);

      // IMPORTS relationship (File -> Import)
      relationships.push(
        this.createRelationship(fileNodeId, importId, 'IMPORTS')
      );
    }

    return { nodes, relationships };
  }

  /**
   * Extract function calls from a function body
   * @param {Object} bodyNode - Function body node
   * @param {string} filePath - File path
   * @param {string} functionId - Parent function ID
   * @returns {Promise<Array>} - Array of CALLS relationships
   */
  async extractCallsFromFunction(bodyNode, filePath, functionId) {
    const relationships = [];

    if (!bodyNode) return relationships;

    // Query for call expressions
    const callQuery = `
      (call
        function: (identifier) @callee
      ) @call_expr
    `;

    // Execute query on the body node subtree
    const matches = this.querySubtree(bodyNode, callQuery);

    for (const match of matches) {
      const calleeNode = match.captures.find(c => c.name === 'callee')?.node;
      const callNode = match.captures.find(c => c.name === 'call_expr')?.node;

      if (!calleeNode || !callNode) continue;

      const calleeName = this.getNodeText(calleeNode);
      const location = this.getNodeLocation(callNode);

      // Create target function ID (will be resolved later)
      const targetFunctionId = generateNodeId('Function', {
        filePath: 'unknown',
        name: calleeName,
        startLine: 0
      });

      // Create CALLS relationship
      relationships.push(
        this.createRelationship(functionId, targetFunctionId, 'CALLS', {
          line: location.startLine
        })
      );
    }

    return relationships;
  }

  /**
   * Extract base classes from argument list
   * @param {Object} basesNode - Bases node
   * @returns {Array<string>} - Base class names
   */
  extractBaseClasses(basesNode) {
    const baseClasses = [];

    for (const child of basesNode.children) {
      if (child.type === 'identifier') {
        baseClasses.push(this.getNodeText(child));
      } else if (child.type === 'attribute') {
        baseClasses.push(this.getNodeText(child));
      }
    }

    return baseClasses;
  }

  /**
   * Extract methods from class body
   * @param {Object} bodyNode - Class body node
   * @param {string} filePath - File path
   * @param {string} classId - Parent class ID
   * @returns {Promise<Array>} - Array of HAS_METHOD relationships
   */
  async extractMethodsFromClass(bodyNode, filePath, classId) {
    const relationships = [];

    if (!bodyNode) return relationships;

    // Find function definitions in class body
    for (const child of bodyNode.children) {
      if (child.type === 'function_definition') {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          const methodName = this.getNodeText(nameNode);
          const location = this.getNodeLocation(child);

          const methodId = generateNodeId('Function', {
            filePath,
            name: methodName,
            startLine: location.startLine
          });

          // Create HAS_METHOD relationship
          relationships.push(
            this.createRelationship(classId, methodId, 'HAS_METHOD')
          );
        }
      }
    }

    return relationships;
  }

  /**
   * Extract decorators for a node
   * @param {Object} decoratedNode - Decorated definition node
   * @param {string} filePath - File path
   * @param {string} targetId - Target node ID (function or class)
   * @returns {Promise<Array>} - Array of DECORATED_WITH relationships
   */
  async extractDecoratorsForNode(decoratedNode, filePath, targetId) {
    const relationships = [];

    for (const child of decoratedNode.children) {
      if (child.type === 'decorator') {
        const nameNode = child.childForFieldName('name') || child.children.find(c => c.type === 'identifier');
        if (nameNode) {
          const decoratorName = this.getNodeText(nameNode);
          const location = this.getNodeLocation(child);

          const decoratorId = generateNodeId('Decorator', {
            filePath,
            name: decoratorName,
            line: location.startLine
          });

          // Create DECORATED_WITH relationship
          relationships.push(
            this.createRelationship(targetId, decoratorId, 'DECORATED_WITH')
          );
        }
      }
    }

    return relationships;
  }

  /**
   * Execute query on a subtree
   * @param {Object} node - Root node for subtree
   * @param {string} queryString - Query string
   * @returns {Array} - Query matches
   */
  querySubtree(node, queryString) {
    const Query = require('tree-sitter').Query;
    const query = new Query(this.parser.getLanguage(), queryString);
    return query.matches(node);
  }
}

module.exports = PythonParser;
