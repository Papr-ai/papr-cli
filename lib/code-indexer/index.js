/**
 * Code Indexer - Main Entry Point
 * Indexes local codebases into PAPR Memory with GraphQL-based semantic search
 */

const { getSchemaManager } = require('./schema/schema-manager');
const { getPaprClient } = require('./utils/papr-client');
const { detectLanguage, shouldIndexFile } = require('./utils/language-detector');
const PythonParser = require('./parsers/python-parser');
const GraphBuilder = require('./graph-builder/graph-builder');
const fs = require('fs').promises;
const path = require('path');

class CodeIndexer {
  constructor() {
    this.schemaManager = getSchemaManager();
    this.paprClient = getPaprClient();
    this.parsers = new Map();
    this.initialized = false;

    // Register parsers
    this.registerParser('python', new PythonParser());
    // TODO: Add JavaScript, TypeScript parsers
  }

  /**
   * Initialize the code indexer
   * - Creates schema if needed (first time only)
   * - Validates PAPR API connection
   */
  async initialize() {
    if (this.initialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      console.log('🔧 Initializing Code Indexer...');

      // Initialize schema (creates only if needed)
      const schemaResult = await this.schemaManager.initializeSchema();

      if (schemaResult.created) {
        console.log('✓ Schema created successfully');
      } else {
        console.log('✓ Using existing schema');
      }

      this.initialized = true;

      return {
        success: true,
        schemaId: schemaResult.schemaId,
        created: schemaResult.created
      };
    } catch (error) {
      console.error('Failed to initialize:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Register a parser for a language
   * @param {string} language - Language name
   * @param {BaseParser} parser - Parser instance
   */
  registerParser(language, parser) {
    this.parsers.set(language.toLowerCase(), parser);
  }

  /**
   * Get parser for a language
   * @param {string} language - Language name
   * @returns {BaseParser|null} - Parser instance or null
   */
  getParser(language) {
    return this.parsers.get(language.toLowerCase()) || null;
  }

  /**
   * Index a single file
   * @param {string} filePath - Path to file
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Result
   */
  async indexFile(filePath, options = {}) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Check if file should be indexed
      if (!shouldIndexFile(filePath, options)) {
        return {
          success: false,
          skipped: true,
          reason: 'File filtered out (test/generated/ignored)'
        };
      }

      // Detect language
      const language = detectLanguage(filePath);
      if (!language) {
        return {
          success: false,
          skipped: true,
          reason: 'Unsupported language'
        };
      }

      // Get parser
      const parser = this.getParser(language);
      if (!parser) {
        return {
          success: false,
          skipped: true,
          reason: `No parser available for ${language}`
        };
      }

      console.log(`📄 Parsing ${path.basename(filePath)}...`);

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');

      // Parse file
      const parseResult = await parser.parseFile(filePath, content);

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error,
          filePath
        };
      }

      // Build graph
      const graphBuilder = new GraphBuilder();
      graphBuilder.addNodes(parseResult.nodes);
      graphBuilder.addRelationships(parseResult.relationships);

      const graphOverride = graphBuilder.buildGraphOverride();
      const memoryContent = graphBuilder.generateMemoryContent(filePath, content);
      const metadata = graphBuilder.generateMetadata(filePath);

      // Send to PAPR Memory
      console.log(`📤 Uploading to PAPR Memory (${graphOverride.nodes.length} nodes, ${graphOverride.relationships.length} relationships)...`);

      const result = await this.paprClient.addCodeMemory({
        content: memoryContent,
        metadata,
        graphOverride
      });

      if (result.success) {
        console.log(`✓ Indexed ${path.basename(filePath)} successfully`);
      }

      return {
        success: result.success,
        filePath,
        stats: parseResult.stats,
        memoryId: result.memoryId,
        graphStats: {
          nodes: graphOverride.nodes.length,
          relationships: graphOverride.relationships.length
        }
      };
    } catch (error) {
      console.error(`Failed to index ${filePath}:`, error.message || error);
      console.error('Stack trace:', error.stack);
      return {
        success: false,
        error: error.message || String(error),
        filePath
      };
    }
  }

  /**
   * Index multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Results summary
   */
  async indexFiles(filePaths, options = {}) {
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      indexed: []
    };

    console.log(`\n📚 Indexing ${filePaths.length} files...\n`);

    for (const filePath of filePaths) {
      const result = await this.indexFile(filePath, options);

      if (result.success) {
        results.success++;
        results.indexed.push({
          path: filePath,
          memoryId: result.memoryId,
          stats: result.stats
        });
      } else if (result.skipped) {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({
          path: filePath,
          error: result.error
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✓ Indexing complete:`);
    console.log(`  - Success: ${results.success}`);
    console.log(`  - Skipped: ${results.skipped}`);
    console.log(`  - Failed: ${results.failed}`);

    return results;
  }

  /**
   * Index a directory recursively
   * @param {string} directoryPath - Path to directory
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Results summary
   */
  async indexDirectory(directoryPath, options = {}) {
    try {
      const files = await this.findCodeFiles(directoryPath, options);
      console.log(`\n📂 Found ${files.length} code files in ${directoryPath}`);

      return await this.indexFiles(files, options);
    } catch (error) {
      console.error('Failed to index directory:', error.message);
      return {
        success: 0,
        failed: 1,
        skipped: 0,
        errors: [{ path: directoryPath, error: error.message }]
      };
    }
  }

  /**
   * Find all code files in a directory recursively
   * @param {string} directoryPath - Path to directory
   * @param {Object} options - Options
   * @returns {Promise<Array<string>>} - Array of file paths
   */
  async findCodeFiles(directoryPath, options = {}) {
    const files = [];

    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip ignored directories
          if (!shouldIndexFile(fullPath + '/', options)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (shouldIndexFile(fullPath, options)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walk(directoryPath);
    return files;
  }

  /**
   * Search indexed code
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async search(query, options = {}) {
    try {
      return await this.paprClient.searchCode({
        query,
        maxResults: options.maxResults || 30,
        enableAgenticGraph: options.enableGraph !== false
      });
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get indexer statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      schemaId: this.schemaManager.getSchemaId(),
      supportedLanguages: Array.from(this.parsers.keys())
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get CodeIndexer singleton instance
 * @returns {CodeIndexer}
 */
function getCodeIndexer() {
  if (!instance) {
    instance = new CodeIndexer();
  }
  return instance;
}

module.exports = {
  CodeIndexer,
  getCodeIndexer
};
