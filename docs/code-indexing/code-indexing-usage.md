# Code Indexing & GraphQL Query Guide

## Overview

PAPR CLI now includes code indexing capabilities that create a knowledge graph of your codebase, enabling:
1. **Natural language search** - Find code using semantic queries
2. **GraphQL introspection** - Discover schema and query code structure
3. **Relationship traversal** - Find dependencies, callers, and call graphs

## Quick Start

### 1. Index Your Codebase

```bash
# Index a Python codebase
papr index ~/Documents/GitHub/my-project

# Include test files
papr index ~/Documents/GitHub/my-project --include-tests

# Include generated files
papr index ~/Documents/GitHub/my-project --include-generated
```

**Supported Languages:**
- ✅ Python (currently)
- 🚧 JavaScript, TypeScript (coming soon)

### 2. Start Claude with Indexed Code

```bash
papr start
```

## Using Code Search Tools

Once your code is indexed, Claude has access to two powerful tools:

### Tool 1: `search_memory` - Natural Language Search

**Use for:** Finding code based on functionality, patterns, or concepts

```typescript
// Claude will use this automatically when you ask:
"Find all authentication functions"
"Show me how password hashing is implemented"
"What are the main classes in this codebase?"
```

**Example:**
```
User: "Find all functions that handle JWT tokens"
Claude: [Uses search_memory tool with query]
Result: Returns functions like generate_token(), verify_token(), etc.
```

### Tool 2: `query_code_graphql` - Structured Graph Queries

**Use for:** Precise queries about code structure and relationships

#### Step 1: Introspection (Discover Schema)

```typescript
// Ask Claude to introspect the schema:
"Show me the GraphQL schema for the indexed code"

// Claude will use:
query_code_graphql({
  introspect: true,
  query: "{ __schema { types { name fields { name type { name } } } } }"
})
```

**Returns:**
```json
{
  "types": [
    { "name": "File", "fields": ["path", "language", "size", "hash"] },
    { "name": "Function", "fields": ["name", "signature", "startLine", "endLine"] },
    { "name": "Class", "fields": ["name", "language", "startLine"] },
    { "name": "Import", "fields": ["moduleName", "importedNames", "line"] }
  ]
}
```

#### Step 2: Query Code Relationships

```typescript
// Example queries you can ask Claude:

"Find all functions defined in the auth module"
"Show me classes that extend BaseUser"
"What functions call the login_user function?"
"List all imports in the authentication files"
```

**GraphQL Query Examples:**

```graphql
# Find functions in a file
{
  file(path: "/path/to/auth.py") {
    functions {
      name
      signature
      startLine
    }
  }
}

# Find function call relationships
{
  function(name: "login_user") {
    calledBy {
      name
      definedIn {
        path
      }
    }
  }
}

# Find class hierarchy
{
  class(name: "AuthService") {
    extends {
      name
    }
    methods {
      name
      signature
    }
  }
}
```

## Code Graph Schema

The indexed code creates the following graph structure:

### Node Types

1. **File**
   - Properties: `path`, `language`, `size`, `hash`, `lastModified`
   - Relationships: Contains functions, classes, imports

2. **Function**
   - Properties: `name`, `signature`, `startLine`, `endLine`, `async`
   - Relationships: `DEFINED_IN` → File, `CALLS` → Function

3. **Class**
   - Properties: `name`, `language`, `startLine`, `endLine`
   - Relationships: `DEFINED_IN` → File, `EXTENDS` → Class, `HAS_METHOD` → Function

4. **Import**
   - Properties: `moduleName`, `importedNames`, `line`, `isWildcard`
   - Relationships: `IMPORTS` (File → Import)

### Relationship Types

- `DEFINED_IN` - Function/Class/Import → File
- `CALLS` - Function → Function (with line number)
- `EXTENDS` - Class → Class (inheritance)
- `HAS_METHOD` - Class → Function (methods)
- `IMPORTS` - File → Import

## Use Cases

### 1. Code Discovery
```
"Show me all authentication-related functions"
"Find database models in this codebase"
```

### 2. Dependency Analysis
```
"What functions does login_user depend on?"
"Show me the call graph for the authentication flow"
```

### 3. Refactoring Support
```
"Find all places where the User class is used"
"What would break if I change the hash_password signature?"
```

### 4. Documentation
```
"Explain the authentication module structure"
"Generate a diagram of class relationships"
```

### 5. Code Review
```
"Find functions with high cyclomatic complexity"
"Show me all functions that don't have error handling"
```

## Natural Language vs GraphQL

### When to Use Natural Language Search (`search_memory`)

✅ **Best for:**
- Exploratory queries: "authentication functions"
- Semantic search: "password validation logic"
- Fuzzy matching: "functions that handle errors"
- Quick overview: "main classes in the project"

### When to Use GraphQL (`query_code_graphql`)

✅ **Best for:**
- Precise structure queries: "Functions with exactly 3 parameters"
- Relationship traversal: "All functions that call login_user"
- Filtering by properties: "Classes with more than 10 methods"
- Complex joins: "Files that import jwt and define async functions"

### Complementary Usage

```
1. Use natural language to discover: "authentication functions"
2. Use GraphQL to analyze: "Show call graph for authenticate()"
3. Use natural language to understand: "Explain what authenticate() does"
```

## Tips for Best Results

### Indexing
1. **Index regularly** - Re-index when significant code changes occur
2. **Exclude unnecessary files** - Don't include tests/generated code unless needed
3. **Use relative paths** - Makes queries more portable

### Searching
1. **Start broad, then narrow** - Use natural language first, GraphQL for precision
2. **Use introspection** - Discover available fields before writing complex queries
3. **Combine tools** - Use search to find, GraphQL to analyze relationships

### GraphQL Queries
1. **Start with introspection** - Always discover schema first
2. **Use specific node types** - Query File/Function/Class instead of generic nodes
3. **Traverse relationships** - Follow CALLS, EXTENDS, HAS_METHOD edges

## Troubleshooting

### Issue: "No code found"
- **Solution:** Re-run `papr index <directory>` to ensure code is indexed

### Issue: "GraphQL query failed"
- **Solution:** Use `introspect: true` to discover the correct schema first

### Issue: "Too many results"
- **Solution:** Use GraphQL with specific filters instead of broad natural language queries

### Issue: "Slow queries"
- **Solution:** Be specific in queries - use file paths or function names to narrow scope

## Advanced: Custom GraphQL Queries

For power users, you can write custom GraphQL queries directly:

```graphql
# Find all async functions that call external APIs
{
  functions(where: { async: true }) {
    name
    calls {
      name
      definedIn {
        path
      }
    }
    filter(where: { calls: { name: { contains: "fetch" } } })
  }
}
```

## Next Steps

1. **Index your codebase**: `papr index ~/path/to/project`
2. **Start Claude**: `papr start`
3. **Try natural language**: "Find authentication functions"
4. **Discover schema**: "Show me the GraphQL schema"
5. **Query relationships**: "What functions call login_user?"

The combination of semantic search and GraphQL introspection makes code exploration 15-20x faster than traditional grep/find tools!
