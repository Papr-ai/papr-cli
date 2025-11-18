/**
 * Schema Manager
 * Handles schema creation and verification
 * Only creates schema once on first use, then reuses existing schema
 */

const { CODE_SCHEMA } = require('./code-schema');
const { getPaprClient } = require('../utils/papr-client');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Store schema ID in user's home directory
const SCHEMA_CACHE_FILE = path.join(os.homedir(), '.papr', 'code-schema-cache.json');

class SchemaManager {
  constructor() {
    this.schemaId = null;
    this.schemaCache = null;
  }

  /**
   * Initialize schema (create if needed, or use existing)
   * @returns {Promise<Object>} - { schemaId, created: boolean }
   */
  async initializeSchema() {
    try {
      // 1. Check local cache first
      const cached = await this.loadCachedSchema();
      if (cached && cached.schemaId) {
        // Verify schema still exists on server
        const exists = await this.verifySchemaExists(cached.schemaId);
        if (exists) {
          this.schemaId = cached.schemaId;
          console.log(`✓ Using existing CodeGraph schema: ${this.schemaId}`);
          return { schemaId: this.schemaId, created: false };
        } else {
          console.log('⚠ Cached schema no longer exists on server, will recreate');
        }
      }

      // 2. Search for existing schema on server
      const existingSchema = await this.findExistingSchema();
      if (existingSchema) {
        this.schemaId = existingSchema.id;
        await this.cacheSchema(this.schemaId);
        console.log(`✓ Found existing CodeGraph schema: ${this.schemaId}`);
        return { schemaId: this.schemaId, created: false };
      }

      // 3. Create new schema
      console.log('Creating new CodeGraph schema...');
      const result = await this.createSchema();
      this.schemaId = result.schemaId;
      await this.cacheSchema(this.schemaId);
      console.log(`✓ Created new CodeGraph schema: ${this.schemaId}`);
      return { schemaId: this.schemaId, created: true };

    } catch (error) {
      throw new Error(`Failed to initialize schema: ${error.message}`);
    }
  }

  /**
   * Create new schema via PAPR API
   * @returns {Promise<Object>} - { schemaId }
   */
  async createSchema() {
    const client = getPaprClient();

    try {
      const result = await client.createSchema(CODE_SCHEMA);

      if (!result.success || !result.schemaId) {
        throw new Error('Schema creation failed: no schemaId returned');
      }

      return { schemaId: result.schemaId };
    } catch (error) {
      // Check if error is due to schema already existing
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('Schema already exists, attempting to find it...');
        const existing = await this.findExistingSchema();
        if (existing) {
          return { schemaId: existing.id };
        }
      }
      throw error;
    }
  }

  /**
   * Find existing schema by name
   * @returns {Promise<Object|null>} - Schema object or null
   */
  async findExistingSchema() {
    const client = getPaprClient();

    try {
      const schemas = await client.listSchemas();

      // Find schema with matching name
      const existing = schemas.find(s =>
        s.name === CODE_SCHEMA.name ||
        s.name.includes('CodeGraph')
      );

      return existing || null;
    } catch (error) {
      console.error('Failed to list schemas:', error.message);
      return null;
    }
  }

  /**
   * Verify schema exists on server
   * @param {string} schemaId - Schema ID to verify
   * @returns {Promise<boolean>} - True if exists
   */
  async verifySchemaExists(schemaId) {
    const client = getPaprClient();

    try {
      const schemas = await client.listSchemas();
      return schemas.some(s => s.id === schemaId);
    } catch (error) {
      console.error('Failed to verify schema:', error.message);
      return false;
    }
  }

  /**
   * Load cached schema info from disk
   * @returns {Promise<Object|null>} - Cached schema info or null
   */
  async loadCachedSchema() {
    try {
      const data = await fs.readFile(SCHEMA_CACHE_FILE, 'utf8');
      const cache = JSON.parse(data);

      // Check if cache is recent (within 30 days)
      const cacheAge = Date.now() - new Date(cache.timestamp).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge < thirtyDays) {
        return cache;
      }

      return null;
    } catch (error) {
      // Cache file doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Cache schema ID to disk
   * @param {string} schemaId - Schema ID to cache
   */
  async cacheSchema(schemaId) {
    try {
      // Ensure .papr directory exists
      const paprDir = path.dirname(SCHEMA_CACHE_FILE);
      await fs.mkdir(paprDir, { recursive: true });

      const cache = {
        schemaId,
        schemaName: CODE_SCHEMA.name,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      await fs.writeFile(SCHEMA_CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.warn('Failed to cache schema:', error.message);
      // Non-critical error, continue
    }
  }

  /**
   * Clear cached schema
   */
  async clearCache() {
    try {
      await fs.unlink(SCHEMA_CACHE_FILE);
      console.log('✓ Schema cache cleared');
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Get current schema ID
   * @returns {string|null} - Schema ID or null if not initialized
   */
  getSchemaId() {
    return this.schemaId;
  }

  /**
   * Get schema info
   * @returns {Object} - Schema definition
   */
  getSchemaDefinition() {
    return CODE_SCHEMA;
  }
}

// Singleton instance
let instance = null;

/**
 * Get SchemaManager singleton instance
 * @returns {SchemaManager}
 */
function getSchemaManager() {
  if (!instance) {
    instance = new SchemaManager();
  }
  return instance;
}

module.exports = {
  SchemaManager,
  getSchemaManager
};
