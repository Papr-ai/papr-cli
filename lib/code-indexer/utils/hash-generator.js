/**
 * Hash Generation Utility
 * Generates consistent hashes for files and symbols
 */

const crypto = require('crypto');

/**
 * Generate hash for file content
 * @param {string} content - File content
 * @returns {string} - MD5 hash
 */
function generateFileHash(content) {
  return crypto
    .createHash('md5')
    .update(content)
    .digest('hex');
}

/**
 * Generate unique ID for a node
 * @param {string} nodeType - Type of node (File, Function, Class, etc.)
 * @param {Object} properties - Node properties
 * @returns {string} - Unique node ID
 */
function generateNodeId(nodeType, properties) {
  // Different ID strategies based on node type
  switch (nodeType) {
    case 'File':
      // Use path as unique identifier
      return `file_${sanitizeForId(properties.path)}`;

    case 'Function':
      // Use file path + name + start line for uniqueness
      return `func_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.name)}_${properties.startLine}`;

    case 'Class':
      // Use file path + name
      return `class_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.name)}`;

    case 'Import':
      // Use file path + module name
      return `import_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.moduleName)}`;

    case 'Export':
      // Use file path + export name
      return `export_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.name)}`;

    case 'Variable':
      // Use file path + name + scope + line
      return `var_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.name)}_${properties.scope}_${properties.line}`;

    case 'CallSite':
      // Use file path + callee name + line
      return `call_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.calleeName)}_${properties.line}`;

    case 'Decorator':
      // Use file path + name + line
      return `dec_${sanitizeForId(properties.filePath)}_${sanitizeForId(properties.name)}_${properties.line}`;

    case 'Comment':
      // Use file path + line
      return `comment_${sanitizeForId(properties.filePath)}_${properties.startLine}`;

    case 'Package':
      // Use name + version
      return `pkg_${sanitizeForId(properties.name)}_${sanitizeForId(properties.version || 'latest')}`;

    default:
      // Fallback: hash all properties
      const propertyString = JSON.stringify(properties);
      const hash = crypto
        .createHash('md5')
        .update(propertyString)
        .digest('hex');
      return `${nodeType.toLowerCase()}_${hash}`;
  }
}

/**
 * Sanitize string for use in ID
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeForId(str) {
  if (!str) return 'unknown';

  return str
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace special chars with underscore
    .replace(/_{2,}/g, '_')            // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '')           // Remove leading/trailing underscores
    .toLowerCase();
}

/**
 * Generate hash for a symbol (function, class, etc.)
 * This is used to detect if the symbol has changed
 * @param {Object} symbol - Symbol properties
 * @returns {string} - Hash of the symbol
 */
function generateSymbolHash(symbol) {
  // Hash relevant properties (excluding metadata like line numbers)
  const relevantProps = {
    name: symbol.name,
    signature: symbol.signature,
    type: symbol.type,
    // Include content hash if available
    content: symbol.content || symbol.code
  };

  const propertyString = JSON.stringify(relevantProps);
  return crypto
    .createHash('md5')
    .update(propertyString)
    .digest('hex');
}

/**
 * Generate short hash (8 characters) for display
 * @param {string} content - Content to hash
 * @returns {string} - Short hash
 */
function generateShortHash(content) {
  return crypto
    .createHash('md5')
    .update(content)
    .digest('hex')
    .substring(0, 8);
}

module.exports = {
  generateFileHash,
  generateNodeId,
  generateSymbolHash,
  generateShortHash,
  sanitizeForId
};
