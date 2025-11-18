/**
 * Graph Builder
 * Converts parsed code entities into PAPR Memory graph_override format
 * Generates rich memory content for semantic search
 */

const { generateNodeId, generateShortHash } = require('../utils/hash-generator');

class GraphBuilder {
  constructor() {
    this.nodes = [];
    this.relationships = [];
    this.nodeIndex = new Map(); // For quick lookups
  }

  /**
   * Add nodes from parser
   * @param {Array} nodes - Array of node objects
   */
  addNodes(nodes) {
    for (const node of nodes) {
      if (!this.nodeIndex.has(node.id)) {
        this.nodes.push(node);
        this.nodeIndex.set(node.id, node);
      }
    }
  }

  /**
   * Add relationships from parser
   * @param {Array} relationships - Array of relationship objects
   */
  addRelationships(relationships) {
    this.relationships.push(...relationships);
  }

  /**
   * Build graph override specification for PAPR Memory
   * @returns {Object} - { nodes, relationships }
   */
  buildGraphOverride() {
    return {
      nodes: this.nodes,
      relationships: this.relationships
    };
  }

  /**
   * Generate rich memory content for a file
   * This content will be searchable via natural language
   * @param {string} filePath - File path
   * @param {string} sourceCode - Source code (optional, for small files)
   * @returns {string} - Rich memory content
   */
  generateMemoryContent(filePath, sourceCode = null) {
    const fileNode = this.nodes.find(n => n.label === 'File' && n.properties.path === filePath);

    if (!fileNode) {
      return `File: ${filePath}`;
    }

    // Get all entities in this file
    const fileNodeId = fileNode.id;
    const functions = this.nodes.filter(n =>
      n.label === 'Function' &&
      this.relationships.some(r =>
        r.source_node_id === n.id &&
        r.target_node_id === fileNodeId &&
        r.relationship_type === 'DEFINED_IN'
      )
    );

    const classes = this.nodes.filter(n =>
      n.label === 'Class' &&
      this.relationships.some(r =>
        r.source_node_id === n.id &&
        r.target_node_id === fileNodeId &&
        r.relationship_type === 'DEFINED_IN'
      )
    );

    const imports = this.nodes.filter(n =>
      n.label === 'Import' &&
      this.relationships.some(r =>
        r.source_node_id === fileNodeId &&
        r.target_node_id === n.id &&
        r.relationship_type === 'IMPORTS'
      )
    );

    // Build rich content
    let content = `# Code File: ${filePath}\n\n`;
    content += `**Language:** ${fileNode.properties.language}\n`;
    content += `**Size:** ${fileNode.properties.size} bytes\n`;
    content += `**Hash:** ${fileNode.properties.hash?.substring(0, 8)}\n\n`;

    // Imports section
    if (imports.length > 0) {
      content += `## Imports (${imports.length})\n`;
      for (const imp of imports.slice(0, 10)) {
        content += `- ${imp.properties.moduleName}`;
        if (imp.properties.importedNames?.length > 0) {
          content += ` (${imp.properties.importedNames.join(', ')})`;
        }
        content += `\n`;
      }
      if (imports.length > 10) {
        content += `... and ${imports.length - 10} more\n`;
      }
      content += `\n`;
    }

    // Classes section
    if (classes.length > 0) {
      content += `## Classes (${classes.length})\n`;
      for (const cls of classes) {
        content += `### ${cls.properties.name}\n`;
        content += `Lines ${cls.properties.startLine}-${cls.properties.endLine}\n`;

        // Get methods
        const methods = this.relationships
          .filter(r =>
            r.source_node_id === cls.id &&
            r.relationship_type === 'HAS_METHOD'
          )
          .map(r => this.nodeIndex.get(r.target_node_id))
          .filter(Boolean);

        if (methods.length > 0) {
          content += `Methods: ${methods.map(m => m.properties.name).join(', ')}\n`;
        }

        // Get base classes
        const baseClasses = this.relationships
          .filter(r =>
            r.source_node_id === cls.id &&
            r.relationship_type === 'EXTENDS'
          )
          .map(r => {
            const baseNode = this.nodeIndex.get(r.target_node_id);
            return baseNode?.properties.name || 'Unknown';
          });

        if (baseClasses.length > 0) {
          content += `Extends: ${baseClasses.join(', ')}\n`;
        }

        content += `\n`;
      }
    }

    // Functions section
    if (functions.length > 0) {
      content += `## Functions (${functions.length})\n`;
      for (const func of functions) {
        content += `### ${func.properties.name}\n`;
        if (func.properties.signature) {
          content += `\`\`\`${fileNode.properties.language}\n${func.properties.signature}\n\`\`\`\n`;
        }
        content += `Lines ${func.properties.startLine}-${func.properties.endLine}\n`;

        // Get calls
        const calls = this.relationships
          .filter(r =>
            r.source_node_id === func.id &&
            r.relationship_type === 'CALLS'
          )
          .map(r => {
            const calledNode = this.nodeIndex.get(r.target_node_id);
            return calledNode?.properties.name || 'unknown';
          });

        if (calls.length > 0) {
          content += `Calls: ${calls.slice(0, 5).join(', ')}`;
          if (calls.length > 5) content += `, ... (${calls.length - 5} more)`;
          content += `\n`;
        }

        // Get decorators
        const decorators = this.relationships
          .filter(r =>
            r.source_node_id === func.id &&
            r.relationship_type === 'DECORATED_WITH'
          )
          .map(r => {
            const decNode = this.nodeIndex.get(r.target_node_id);
            return decNode?.properties.name || 'unknown';
          });

        if (decorators.length > 0) {
          content += `Decorators: @${decorators.join(', @')}\n`;
        }

        content += `\n`;
      }
    }

    // ALWAYS include full source code for searchability
    // The graph provides structure, but we need the actual code for semantic search
    if (sourceCode) {
      content += `## Full Source Code\n\`\`\`${fileNode.properties.language}\n${sourceCode}\n\`\`\`\n`;
    }

    return content;
  }

  /**
   * Generate metadata for PAPR memory
   * @param {string} filePath - File path
   * @returns {Object} - Metadata object
   */
  generateMetadata(filePath) {
    const fileNode = this.nodes.find(n => n.label === 'File' && n.properties.path === filePath);

    if (!fileNode) {
      return {
        filePath,
        language: 'unknown',
        topics: ['code']
      };
    }

    // Extract topics from file path and entities
    const topics = ['code', fileNode.properties.language];

    // Add topics based on file path
    const pathParts = filePath.split('/');
    for (const part of pathParts) {
      if (part && part !== '..' && part !== '.' && !part.startsWith('.')) {
        topics.push(part.replace(/\.[^.]+$/, '')); // Remove extension
      }
    }

    // Add entity types as topics
    const hasClasses = this.nodes.some(n =>
      n.label === 'Class' &&
      this.relationships.some(r =>
        r.source_node_id === n.id &&
        r.target_node_id === fileNode.id &&
        r.relationship_type === 'DEFINED_IN'
      )
    );

    const hasFunctions = this.nodes.some(n =>
      n.label === 'Function' &&
      this.relationships.some(r =>
        r.source_node_id === n.id &&
        r.target_node_id === fileNode.id &&
        r.relationship_type === 'DEFINED_IN'
      )
    );

    if (hasClasses) topics.push('classes');
    if (hasFunctions) topics.push('functions');

    // Emoji tags
    const emojiTags = ['💻', '📄'];
    if (fileNode.properties.language === 'python') emojiTags.push('🐍');
    if (fileNode.properties.language === 'javascript') emojiTags.push('🟨');
    if (fileNode.properties.language === 'typescript') emojiTags.push('🔷');

    return {
      filePath,
      language: fileNode.properties.language,
      topics: [...new Set(topics)].slice(0, 10), // Limit to 10 unique topics
      emojiTags
    };
  }

  /**
   * Get statistics about the graph
   * @returns {Object} - Statistics
   */
  getStats() {
    const nodesByType = {};
    for (const node of this.nodes) {
      nodesByType[node.label] = (nodesByType[node.label] || 0) + 1;
    }

    const relationshipsByType = {};
    for (const rel of this.relationships) {
      relationshipsByType[rel.relationship_type] = (relationshipsByType[rel.relationship_type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.length,
      totalRelationships: this.relationships.length,
      nodesByType,
      relationshipsByType
    };
  }

  /**
   * Clear all nodes and relationships
   */
  clear() {
    this.nodes = [];
    this.relationships = [];
    this.nodeIndex.clear();
  }

  /**
   * Get all nodes
   * @returns {Array} - All nodes
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Get all relationships
   * @returns {Array} - All relationships
   */
  getRelationships() {
    return this.relationships;
  }

  /**
   * Find node by ID
   * @param {string} nodeId - Node ID
   * @returns {Object|null} - Node or null
   */
  findNode(nodeId) {
    return this.nodeIndex.get(nodeId) || null;
  }
}

module.exports = GraphBuilder;
