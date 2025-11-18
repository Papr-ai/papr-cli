# Code Indexing Implementation Plan

**Project**: Local Codebase Indexing for PAPR Memory
**Start Date**: January 2025
**Duration**: 8 weeks
**Status**: Ready to Begin

---

## Executive Summary

Build a GraphQL-based code introspection system that indexes local codebases into PAPR Memory, providing **15-20x faster** semantic search than grep with complete code context.

**Core Architecture**:
- Tree-sitter AST → Graph nodes/relationships (direct conversion)
- PAPR Memory custom schema (10 nodes, 20 relationships)
- ChromaDB via `sync_tiers` (automatic local tier)
- GraphQL introspection + natural language search
- Language-agnostic design (Python, JS, TS, Java, Go)

---

## Phase 1: Foundation (Weeks 1-2)

### Goal
Basic code parsing and graph creation working

### Tasks

#### Week 1: Setup & Parser
**Days 1-2**: Environment Setup
- [ ] Install tree-sitter and language grammars
  ```bash
  npm install tree-sitter tree-sitter-python tree-sitter-javascript
  npm install tree-sitter-typescript tree-sitter-java tree-sitter-go
  ```
- [ ] Setup PAPR Memory API client
- [ ] Create project structure:
  ```
  papr-cli/
    lib/
      code-indexer/
        parsers/          # Language-specific parsers
        graph-builder/    # Graph node/relationship builder
        schema/           # PAPR schema definitions
        sync/             # File watching and sync
    ```

**Days 3-5**: Core Parser Implementation
- [ ] Implement `FileParser` base class
- [ ] Implement Python parser (extract Functions, Classes, Imports)
- [ ] Implement JavaScript/TypeScript parser
- [ ] Test with small sample files (10-20 files)

#### Week 2: Graph Builder
**Days 1-3**: Node Extraction
- [ ] Build `File` node extractor
- [ ] Build `Function` node extractor (with line numbers, signatures)
- [ ] Build `Class` node extractor (with inheritance)
- [ ] Build `Import` node extractor

**Days 4-5**: Relationship Builder
- [ ] Implement `DEFINED_IN` relationships
- [ ] Implement `CALLS` relationships (function call tracking)
- [ ] Implement `EXTENDS` relationships (class inheritance)
- [ ] Implement `IMPORTS` relationships

### Deliverables
- [ ] Parser module for 2+ languages
- [ ] Graph node/relationship builder working
- [ ] Test suite with small codebase (100-500 files)

### Success Criteria
- Parse accuracy: >95%
- Index time: <100ms per file
- Graph nodes created correctly in test codebase

---

## Phase 2: PAPR Integration (Weeks 3-4)

### Goal
Complete schema in PAPR Memory with all nodes and relationships

### Tasks

#### Week 3: Schema Creation
**Days 1-2**: PAPR Schema API
- [ ] Create custom schema via PAPR API
  ```javascript
  const schema = {
    name: "CodeGraph_v1",
    description: "Code repository semantic graph",
    node_types: { /* 10 node types */ },
    relationship_types: { /* 20 relationships */ }
  };

  await paprClient.schemas.create(schema);
  ```
- [ ] Test schema creation and validation
- [ ] Create indexes for common queries

**Days 3-5**: Memory Addition with Graph Override
- [ ] Implement `addToMemory` function with graph_override
- [ ] Batch node/relationship creation (max 100 per batch)
- [ ] Handle large codebases with chunking
- [ ] Test with 1K-10K file codebase

#### Week 4: Advanced Nodes
**Days 1-2**: Additional Node Types
- [ ] Implement `CallSite` nodes (precise call tracking)
- [ ] Implement `Decorator` nodes (Python, TS annotations)
- [ ] Implement `Export` nodes (module exports)
- [ ] Implement `Variable` nodes (for data flow)

**Days 3-5**: Complete Relationships
- [ ] Implement remaining 12 relationships:
  - [ ] CALLED_BY (bidirectional)
  - [ ] HAS_METHOD, HAS_FIELD
  - [ ] IMPORTS_FROM, EXPORTS, EXPORTS_SYMBOL
  - [ ] HAS_PARAMETER, USES_VARIABLE, ASSIGNS_TO
  - [ ] DECORATED_WITH, DOCUMENTS
  - [ ] DEPENDS_ON, TESTED_BY
- [ ] Test all relationships with sample queries

### Deliverables
- [ ] Complete PAPR schema with 10 nodes + 20 relationships
- [ ] Memory addition with graph_override working
- [ ] Test codebase fully indexed (10K files)

### Success Criteria
- All 10 node types created successfully
- All 20 relationships working
- GraphQL queries return expected results
- Index time: <10 minutes for 10K files

---

## Phase 3: Incremental Sync (Weeks 5-6)

### Goal
File watching and incremental updates

### Tasks

#### Week 5: File Watching
**Days 1-2**: Git-Aware Change Detection
- [ ] Implement file watcher with `chokidar`
  ```javascript
  const watcher = chokidar.watch(repoPath, {
    ignored: /(node_modules|\.git|dist)/,
    ignoreInitial: true
  });
  ```
- [ ] Git status integration (`git diff`, `git status --porcelain`)
- [ ] Debouncing (2-second batching)

**Days 3-5**: Incremental Indexing
- [ ] Detect which symbols changed (file-level → symbol-level)
- [ ] Update only modified nodes/relationships
- [ ] Handle file deletions (remove orphaned nodes)
- [ ] Test with live file changes

#### Week 6: Sync Strategy
**Days 1-3**: Local + Cloud Sync
- [ ] Leverage `sync_tiers` for ChromaDB (no manual setup needed!)
- [ ] Configurable sync intervals (default: hourly)
- [ ] Manual sync command: `/sync-code`
- [ ] Conflict resolution (timestamp-based)

**Days 4-5**: Version Tracking
- [ ] Track file git hash for change detection
- [ ] Symbol-level versioning
- [ ] Handle merge conflicts
- [ ] Test with complex git operations (merge, rebase)

### Deliverables
- [ ] File watcher service running
- [ ] Incremental indexing working
- [ ] Sync manager with conflict resolution
- [ ] Test with continuous development workflow

### Success Criteria
- File changes detected within 2 seconds
- Incremental update time: <5 seconds for typical change
- No full reindex required
- ChromaDB automatically updated via sync_tiers

---

## Phase 4: Query & Search (Weeks 7-8)

### Goal
GraphQL queries and natural language search

### Tasks

#### Week 7: Query Templates
**Days 1-2**: Common Query Patterns
- [ ] Create query templates for 25 use-cases
  ```javascript
  const QUERY_TEMPLATES = {
    findReferences: `query { Function(where: {name: $name}) { calledBy { name definedIn { path } } } }`,
    findCallers: `query { ... }`,
    // etc.
  };
  ```
- [ ] Query builder helper functions
- [ ] Result formatting (JSON → readable output)

**Days 3-5**: Natural Language Search
- [ ] Integrate PAPR natural language search
- [ ] Combine semantic search + graph traversal
- [ ] Memory content structure for code symbols
- [ ] Test with complex queries

#### Week 8: CLI Integration
**Days 1-3**: papr-cli Commands
- [ ] Add MCP tool: `code_search`
  ```javascript
  {
    name: "code_search",
    description: "Search code using GraphQL or natural language",
    parameters: { query, language, file }
  }
  ```
- [ ] Add MCP tool: `index_code`
- [ ] Add command: `/search-code <query>`
- [ ] Add command: `/index-code [path]`
- [ ] Add command: `/sync-code`

**Days 4-5**: Testing & Documentation
- [ ] End-to-end testing with real codebases
- [ ] Performance benchmarking
- [ ] User documentation
- [ ] CLI help text and examples

### Deliverables
- [ ] 25+ query templates implemented
- [ ] Natural language + GraphQL combined search
- [ ] MCP tools for code search
- [ ] CLI commands working
- [ ] Complete documentation

### Success Criteria
- All 25 use-cases working
- Query response time p95: <1 second
- Natural language queries accurate
- Developer-friendly CLI experience

---

## Architecture Diagram

```
Local Codebase (~/documents/github/memory)
    ↓
File Watcher (chokidar + git aware)
    ↓
Tree-sitter Parser (multi-language)
    ↓
Graph Builder (nodes + relationships)
    ↓
PAPR Memory API (add with graph_override)
    ↓
sync_tiers (automatic)
    ↓
ChromaDB (local tier, 200 files)
    ↓
GraphQL Introspection + Natural Language Search
    ↓
papr-cli MCP Tools
    ↓
Claude Code Interface
```

---

## Technical Stack

### Core Dependencies
```json
{
  "tree-sitter": "^0.21.0",
  "tree-sitter-python": "^0.21.0",
  "tree-sitter-javascript": "^0.21.0",
  "tree-sitter-typescript": "^0.21.0",
  "tree-sitter-java": "^0.21.0",
  "tree-sitter-go": "^0.21.0",
  "chokidar": "^3.6.0",
  "@papr/memory": "^2.14.0"
}
```

### PAPR Memory Integration
- Custom schema API for graph structure
- Graph override for deterministic indexing
- Natural language search endpoint
- sync_tiers for local ChromaDB (automatic)

---

## File Structure

```
papr-cli/
  lib/
    code-indexer/
      index.js                 # Main entry point
      parsers/
        base-parser.js         # Abstract parser class
        python-parser.js       # Python-specific
        javascript-parser.js   # JS/TS-specific
        java-parser.js         # Java-specific
      graph-builder/
        node-builder.js        # Create graph nodes
        relationship-builder.js # Create relationships
        graph-override.js      # Build graph_override spec
      schema/
        code-schema.js         # PAPR schema definition
        query-templates.js     # GraphQL query templates
      sync/
        file-watcher.js        # Chokidar integration
        git-integration.js     # Git status/diff
        sync-manager.js        # Sync to PAPR
      utils/
        language-detector.js   # Detect file language
        hash-generator.js      # File/symbol hashing
  templates/
    code-indexer-agent.md     # Agent for code indexing
  docs/
    code-indexing-deep-dive.md        # Comprehensive design
    code-indexing-implementation-plan.md  # This file
```

---

## Key Implementation Details

### 1. Tree-sitter Query Examples

**Python Functions**:
```javascript
const query = pythonLanguage.query(`
  (function_definition
    name: (identifier) @func_name
    parameters: (parameters) @params
    body: (block) @body
  ) @func_def
`);
```

**JavaScript Calls**:
```javascript
const query = jsLanguage.query(`
  (call_expression
    function: (identifier) @callee
    arguments: (arguments) @args
  ) @call
`);
```

### 2. Graph Override Structure

```javascript
const graphOverride = {
  nodes: [
    {
      id: "func_auth_py_authenticate_user_42",
      label: "Function",
      properties: {
        name: "authenticate_user",
        signature: "async def authenticate_user(email, password)",
        language: "python",
        startLine: 42,
        endLine: 67
      }
    }
  ],
  relationships: [
    {
      source_node_id: "func_auth_py_authenticate_user_42",
      target_node_id: "file_src_api_auth_py",
      relationship_type: "DEFINED_IN"
    }
  ]
};
```

### 3. Memory Content Structure

```javascript
const memoryContent = `
Function: authenticate_user
Signature: async def authenticate_user(email: str, password: str) -> User
Language: Python
File: src/api/auth.py
Lines: 42-67

Documentation:
Authenticates user with JWT tokens...

Code:
async def authenticate_user(...):
    ...

Called by: login_handler, verify_session
Calls: db.users.find_one, verify_password
`;

await paprClient.memory.add({
  content: memoryContent,
  metadata: {
    type: "code_function",
    language: "python",
    file_path: "src/api/auth.py"
  },
  graph_override: graphOverride
});
```

### 4. Incremental Update Logic

```javascript
async function handleFileChange(filePath) {
  // 1. Parse new version
  const newNodes = await parseFile(filePath);

  // 2. Find existing nodes
  const existingNodes = await findNodesByFile(filePath);

  // 3. Diff and update
  const toDelete = existingNodes.filter(n => !newNodes.find(nn => nn.id === n.id));
  const toAdd = newNodes.filter(nn => !existingNodes.find(n => n.id === nn.id));
  const toUpdate = newNodes.filter(nn => {
    const existing = existingNodes.find(n => n.id === nn.id);
    return existing && existing.hash !== nn.hash;
  });

  // 4. Apply changes
  await deleteNodes(toDelete);
  await addNodes(toAdd);
  await updateNodes(toUpdate);
}
```

---

## Performance Targets

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Parse time per file | <100ms | <50ms |
| Index 10K files | <10min | <5min |
| Query response p95 | <1s | <500ms |
| Incremental update | <5s | <2s |
| Storage per 1K files | <10MB | <5MB |
| Accuracy | >95% | >98% |

---

## Risk Mitigation

### Risk 1: Tree-sitter Parsing Errors
**Mitigation**: Graceful error handling, skip unparseable files, log for manual review

### Risk 2: Large Codebase Performance
**Mitigation**: Batch processing (100 files at a time), parallel parsing, incremental indexing

### Risk 3: PAPR API Rate Limits
**Mitigation**: Local caching, batched updates, exponential backoff

### Risk 4: Graph Relationship Complexity
**Mitigation**: Start with core relationships (CALLS, EXTENDS, IMPORTS), add others incrementally

### Risk 5: Multi-language Support
**Mitigation**: Focus on Python/JS first, add languages progressively

---

## Testing Strategy

### Unit Tests
- [ ] Parser accuracy for each language
- [ ] Node extraction correctness
- [ ] Relationship building logic
- [ ] Graph override generation

### Integration Tests
- [ ] PAPR API schema creation
- [ ] Memory addition with graph_override
- [ ] GraphQL queries
- [ ] File watcher triggers

### End-to-End Tests
- [ ] Index full codebase (memory repo ~10K files)
- [ ] All 25 use-case queries working
- [ ] Incremental updates on file changes
- [ ] Natural language search accuracy

### Performance Tests
- [ ] Benchmark parsing speed
- [ ] Benchmark indexing time
- [ ] Benchmark query response time
- [ ] Load test with 100K files

---

## Success Metrics

### Week 2 Checkpoint
- [ ] Python parser working
- [ ] Basic graph nodes created
- [ ] Test codebase indexed (500 files)

### Week 4 Checkpoint
- [ ] PAPR schema created
- [ ] All node types working
- [ ] Test queries return results (10K files)

### Week 6 Checkpoint
- [ ] File watcher operational
- [ ] Incremental updates working
- [ ] Continuous sync demonstrated

### Week 8 Completion
- [ ] All 25 use-cases working
- [ ] CLI commands functional
- [ ] Performance targets met
- [ ] Documentation complete

---

## Launch Checklist

- [ ] All phases completed
- [ ] Test coverage >80%
- [ ] Performance benchmarks passed
- [ ] Documentation reviewed
- [ ] User guide written
- [ ] Demo video created
- [ ] Announcement prepared
- [ ] Feedback channels setup

---

## Next Actions

1. **Immediate**: Review and approve this plan
2. **Day 1**: Setup development environment
3. **Day 2**: Implement first parser (Python)
4. **Week 1**: Complete Phase 1 foundation
5. **Week 2**: Begin PAPR integration

---

**Plan Version**: 1.0
**Last Updated**: January 13, 2025
**Status**: Ready to Execute ✅