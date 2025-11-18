/**
 * Language Detection Utility
 * Detects programming language from file extension
 */

const path = require('path');

const LANGUAGE_MAP = {
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',

  // JavaScript/TypeScript
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // Java
  '.java': 'java',

  // Go
  '.go': 'go',

  // Rust
  '.rs': 'rust',

  // C/C++
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',

  // Ruby
  '.rb': 'ruby',

  // PHP
  '.php': 'php',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell'
};

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /target/,
  /\.next/,
  /\.vscode/,
  /\.idea/,
  /__pycache__/,
  /\.pytest_cache/,
  /\.DS_Store/,
  /\.env/,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/
];

/**
 * Detect programming language from file path
 * @param {string} filePath - Path to the file
 * @returns {string|null} - Language name or null if not supported
 */
function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || null;
}

/**
 * Check if file should be indexed
 * @param {string} filePath - Path to the file
 * @param {Object} options - Options
 * @param {boolean} options.includeTests - Whether to include test files (default: false)
 * @param {boolean} options.includeGenerated - Whether to include generated files (default: false)
 * @returns {boolean} - True if file should be indexed
 */
function shouldIndexFile(filePath, options = {}) {
  const {
    includeTests = false,
    includeGenerated = false
  } = options;

  // Check ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(filePath)) {
      return false;
    }
  }

  // Check if we can detect the language
  const language = detectLanguage(filePath);
  if (!language) {
    return false;
  }

  // Skip test files unless explicitly included
  if (!includeTests) {
    const testPatterns = [
      /test[s]?\//,
      /\/__tests__\//,
      /\.test\./,
      /\.spec\./,
      /_test\./
    ];

    for (const pattern of testPatterns) {
      if (pattern.test(filePath)) {
        return false;
      }
    }
  }

  // Skip generated files unless explicitly included
  if (!includeGenerated) {
    const generatedPatterns = [
      /\.generated\./,
      /\.gen\./,
      /-generated\./,
      /generated\//,
      /gen\//
    ];

    for (const pattern of generatedPatterns) {
      if (pattern.test(filePath)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get all supported languages
 * @returns {string[]} - Array of supported language names
 */
function getSupportedLanguages() {
  return [...new Set(Object.values(LANGUAGE_MAP))];
}

/**
 * Check if a language is supported
 * @param {string} language - Language name
 * @returns {boolean} - True if supported
 */
function isLanguageSupported(language) {
  return Object.values(LANGUAGE_MAP).includes(language.toLowerCase());
}

module.exports = {
  detectLanguage,
  shouldIndexFile,
  getSupportedLanguages,
  isLanguageSupported,
  LANGUAGE_MAP,
  IGNORE_PATTERNS
};
