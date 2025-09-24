# Contributing to PAPR CLI

Thank you for your interest in contributing to PAPR CLI! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites
- Node.js 16+
- NPM or Yarn
- Claude CLI installed globally

### Local Development
```bash
# Clone the repository
git clone https://github.com/papr-ai/papr-cli.git
cd papr-cli

# Install dependencies
npm install

# Link for local testing
npm link

# Get API key from dashboard.papr.ai for testing
# Test the CLI
papr --help
papr status
```

## Project Structure

```
papr-cli/
├── bin/papr              # CLI executable
├── lib/index.js          # Core functionality
├── templates/
│   └── session-hook.js   # Memory session hooks
├── .github/workflows/    # CI/CD workflows
└── tests/                # Test files
```

## Making Changes

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Locally
```bash
npm test
npm run lint

# Test CLI functionality
papr init --api-key test-key
papr status
```

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new feature description"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

## Code Style

- Use ES6+ features
- Follow ESLint configuration
- Add JSDoc comments for functions
- Use descriptive variable names
- Handle errors gracefully

## Testing

### Running Tests
```bash
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
```

### Writing Tests
- Place tests in `tests/` directory
- Use Jest framework
- Test both success and error cases
- Mock external dependencies

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update CHANGELOG.md following semver

## Pull Request Guidelines

### PR Title Format
- `feat: add new feature`
- `fix: resolve bug in feature`
- `docs: update documentation`
- `test: add tests for feature`
- `refactor: improve code structure`

### PR Description
Include:
- What changes were made
- Why the changes were necessary
- How to test the changes
- Any breaking changes
- Related issues

### PR Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or clearly documented)

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backwards compatible)
- Patch: Bug fixes

### Creating a Release
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create and push version tag:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```
4. GitHub Actions will automatically publish to NPM

## Getting Help

- 📖 [Documentation](https://platform.papr.ai/docs)
- 💬 [Discord Community](https://discord.gg/rd4BKfSD)
- 🐛 [Issues](https://github.com/papr-ai/papr-cli/issues)

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Provide constructive feedback
- Focus on the best outcome for the community
- Show empathy towards other contributors

### Unacceptable Behavior
- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing private information
- Other unprofessional conduct

## License

By contributing to PAPR CLI, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to PAPR CLI! 🚀