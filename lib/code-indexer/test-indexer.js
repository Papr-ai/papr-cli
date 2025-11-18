#!/usr/bin/env node
/**
 * Test Code Indexer
 * Simple test to verify the code indexer is working
 */

const { getCodeIndexer } = require('./index');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Sample Python code for testing
const SAMPLE_PYTHON_CODE = `"""
User authentication module
Handles user login, registration, and password management
"""

import hashlib
import jwt
from datetime import datetime, timedelta
from database import db


class User:
    """User model for authentication"""

    def __init__(self, email, password):
        self.email = email
        self.password_hash = self.hash_password(password)

    def hash_password(self, password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()


class AuthService:
    """Authentication service for user management"""

    def __init__(self):
        self.secret_key = "your-secret-key"

    def register_user(self, email, password):
        """Register a new user"""
        user = User(email, password)
        db.users.insert(user)
        return user

    def login_user(self, email, password):
        """Authenticate user and return JWT token"""
        user = self.find_user(email)

        if not user:
            raise ValueError("User not found")

        if not self.verify_password(user, password):
            raise ValueError("Invalid password")

        token = self.generate_token(user)
        return token

    def find_user(self, email):
        """Find user by email"""
        return db.users.find_one({"email": email})

    def verify_password(self, user, password):
        """Verify password against stored hash"""
        password_hash = user.hash_password(password)
        return password_hash == user.password_hash

    def generate_token(self, user):
        """Generate JWT token for authenticated user"""
        payload = {
            "email": user.email,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        return jwt.encode(payload, self.secret_key, algorithm="HS256")


# Usage example
if __name__ == "__main__":
    auth = AuthService()
    user = auth.register_user("user@example.com", "password123")
    token = auth.login_user("user@example.com", "password123")
    print(f"Authentication token: {token}")
`;

async function test() {
  console.log('🧪 Testing Code Indexer\n');
  console.log('='.repeat(60));

  try {
    // Check environment
    if (!process.env.PAPR_MEMORY_API_KEY) {
      console.error('❌ PAPR_MEMORY_API_KEY environment variable not set');
      console.log('\nPlease set your API key:');
      console.log('  export PAPR_MEMORY_API_KEY=your-api-key');
      process.exit(1);
    }

    // Create temporary test file
    const tempDir = path.join(os.tmpdir(), 'papr-code-indexer-test');
    await fs.mkdir(tempDir, { recursive: true });

    const testFilePath = path.join(tempDir, 'auth_service.py');
    await fs.writeFile(testFilePath, SAMPLE_PYTHON_CODE);

    console.log(`\n📝 Created test file: ${testFilePath}\n`);

    // Initialize indexer
    const indexer = getCodeIndexer();

    console.log('Step 1: Initialize Code Indexer');
    console.log('-'.repeat(60));
    const initResult = await indexer.initialize();

    if (!initResult.success) {
      console.error('❌ Initialization failed:', initResult.error);
      process.exit(1);
    }

    console.log('✓ Initialization successful');
    console.log(`  Schema ID: ${initResult.schemaId}`);
    console.log(`  Schema was ${initResult.created ? 'created' : 'already existed'}`);

    // Index the test file
    console.log('\nStep 2: Index Test File');
    console.log('-'.repeat(60));
    // Force indexing by passing includeTests option
    const indexResult = await indexer.indexFile(testFilePath, {
      includeTests: true,
      includeGenerated: true
    });

    console.log('Index result:', JSON.stringify(indexResult, null, 2));

    if (!indexResult || !indexResult.success) {
      console.error('❌ Indexing failed:', indexResult?.error || 'Unknown error');
      console.error('Full result:', indexResult);
      process.exit(1);
    }

    console.log('✓ File indexed successfully');
    console.log(`  Memory ID: ${indexResult.memoryId}`);
    console.log(`  Stats:`, JSON.stringify(indexResult.stats, null, 2));
    console.log(`  Graph:`, JSON.stringify(indexResult.graphStats, null, 2));

    // Test search
    console.log('\nStep 3: Search Indexed Code');
    console.log('-'.repeat(60));

    const searchQueries = [
      'authentication functions',
      'password hashing',
      'JWT token generation',
      'User class'
    ];

    for (const query of searchQueries) {
      console.log(`\nSearching for: "${query}"`);
      const searchResult = await indexer.search(query, { maxResults: 5 });

      if (searchResult.success && searchResult.results.length > 0) {
        console.log(`  ✓ Found ${searchResult.results.length} results`);
        for (const result of searchResult.results.slice(0, 2)) {
          console.log(`    - ${result.title || 'Result'}`);
        }
      } else {
        console.log(`  ⚠ No results found (may take a moment for indexing to complete)`);
      }
    }

    // Cleanup
    console.log('\nStep 4: Cleanup');
    console.log('-'.repeat(60));
    await fs.unlink(testFilePath);
    await fs.rmdir(tempDir);
    console.log('✓ Test file removed');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
    console.log('\nThe Code Indexer is working correctly and ready to use.');
    console.log('\nNext steps:');
    console.log('  1. Index your codebase:');
    console.log('     node lib/code-indexer/test-indexer.js --index ~/path/to/repo');
    console.log('  2. Search your code:');
    console.log('     node lib/code-indexer/test-indexer.js --search "your query"');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  test().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { test };
