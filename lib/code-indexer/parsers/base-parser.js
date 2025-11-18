/**
 * Base Parser Class
 * Abstract class for all language-specific parsers
 * Provides common functionality for parsing code with tree-sitter
 */

const Parser = require('tree-sitter');
const { generateNodeId, generateFileHash } = require('../utils/hash-generator');
const fs = require('fs').promises;
const path = require('path');

class BaseParser {
  constructor(language, languageName) {
    this.parser = new Parser();
    this.parser.setLanguage(language);
    this.languageName = languageName;
  }

  /**
   * Parse a file and extract all code entities
   * @param {string} filePath - Path to the file
   * @param {string} content - File content (optional, will read if not provided)
   * @returns {Promise<Object>} - Parsed entities { nodes, relationships }
   */
  async parseFile(filePath, content = null) {
    try {
      // Read file if content not provided
      if (!content) {
        content = await fs.readFile(filePath, 'utf8');
      }

      // Parse with tree-sitter
      const tree = this.parser.parse(content);

      // Generate file hash
      const fileHash = generateFileHash(content);

      // Create File node
      const fileNode = this.createFileNode(filePath, content, fileHash);

      // Extract entities
      const functions = await this.extractFunctions(tree, filePath);
      const classes = await this.extractClasses(tree, filePath);
      const imports = await this.extractImports(tree, filePath);
      const exports = await this.extractExports(tree, filePath);
      const variables = await this.extractVariables(tree, filePath);
      const comments = await this.extractComments(tree, filePath);

      // Combine all nodes
      const nodes = [
        fileNode,
        ...functions.nodes,
        ...classes.nodes,
        ...imports.nodes,
        ...exports.nodes,
        ...variables.nodes,
        ...comments.nodes
      ];

      // Combine all relationships
      const relationships = [
        ...functions.relationships,
        ...classes.relationships,
        ...imports.relationships,
        ...exports.relationships,
        ...variables.relationships,
        ...comments.relationships
      ];

      return {
        success: true,
        nodes,
        relationships,
        stats: {
          functions: functions.nodes.length,
          classes: classes.nodes.length,
          imports: imports.nodes.length,
          exports: exports.nodes.length,
          variables: variables.nodes.length,
          comments: comments.nodes.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  /**
   * Create File node
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {string} hash - Content hash
   * @returns {Object} - File node
   */
  createFileNode(filePath, content, hash) {
    const stats = {
      size: Buffer.byteLength(content, 'utf8')
    };

    return {
      id: generateNodeId('File', { path: filePath }),
      label: 'File',
      properties: {
        path: filePath,
        language: this.languageName,
        size: stats.size,
        hash: hash,
        lastModified: new Date().toISOString()
      }
    };
  }

  /**
   * Create a relationship
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @param {string} type - Relationship type
   * @param {Object} properties - Optional properties
   * @returns {Object} - Relationship
   */
  createRelationship(sourceId, targetId, type, properties = {}) {
    return {
      source_node_id: sourceId,
      target_node_id: targetId,
      relationship_type: type,
      properties
    };
  }

  /**
   * Execute a tree-sitter query
   * @param {Object} tree - Parsed tree
   * @param {string} queryString - Query string
   * @returns {Array} - Query matches
   */
  query(tree, queryString) {
    const Query = require('tree-sitter').Query;
    const query = new Query(this.parser.getLanguage(), queryString);
    return query.matches(tree.rootNode);
  }

  /**
   * Get node text
   * @param {Object} node - Tree-sitter node
   * @returns {string} - Node text
   */
  getNodeText(node) {
    return node.text;
  }

  /**
   * Get node location
   * @param {Object} node - Tree-sitter node
   * @returns {Object} - { startLine, endLine, startColumn, endColumn }
   */
  getNodeLocation(node) {
    return {
      startLine: node.startPosition.row + 1,  // 1-indexed
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column,
      endColumn: node.endPosition.column
    };
  }

  // Abstract methods to be implemented by language-specific parsers

  /**
   * Extract functions from parsed tree
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractFunctions(tree, filePath) {
    throw new Error('extractFunctions() must be implemented by subclass');
  }

  /**
   * Extract classes from parsed tree
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractClasses(tree, filePath) {
    throw new Error('extractClasses() must be implemented by subclass');
  }

  /**
   * Extract imports from parsed tree
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractImports(tree, filePath) {
    throw new Error('extractImports() must be implemented by subclass');
  }

  /**
   * Extract exports from parsed tree
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractExports(tree, filePath) {
    // Default: no exports (can be overridden)
    return { nodes: [], relationships: [] };
  }

  /**
   * Extract variables from parsed tree
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractVariables(tree, filePath) {
    // Default: skip variables (can be overridden)
    return { nodes: [], relationships: [] };
  }

  /**
   * Extract comments from parsed tree
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @returns {Promise<Object>} - { nodes: [], relationships: [] }
   */
  async extractComments(tree, filePath) {
    // Default: skip comments (can be overridden)
    return { nodes: [], relationships: [] };
  }

  /**
   * Extract function calls (CallSite nodes)
   * @param {Object} tree - Parsed tree
   * @param {string} filePath - File path
   * @param {string} functionId - Parent function ID
   * @returns {Array} - CallSite relationships
   */
  async extractCalls(tree, filePath, functionId) {
    // Default implementation (can be overridden)
    return [];
  }
}

module.exports = BaseParser;
