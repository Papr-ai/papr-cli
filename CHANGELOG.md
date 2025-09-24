# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial PAPR CLI implementation
- Memory-enhanced Claude CLI with persistent context
- Automated session start hooks with PAPR memory integration
- Parallel memory searches for general context and Vercel AI SDK migration
- Beautiful ASCII branding and user experience
- Cross-platform support (Windows, macOS, Linux)

### Features
- `papr init` - Initialize PAPR with Claude CLI and memory hooks
- `papr start` - Launch Claude CLI with memory context
- `papr status` - Check configuration and system status
- `papr update-hooks` - Update memory hooks to latest version
- `papr uninstall` - Remove PAPR hooks and restore clean Claude CLI

## [1.0.0] - 2024-01-XX

### Added
- Initial release of PAPR CLI
- Integration with @papr/memory SDK
- Automated Claude CLI setup and configuration
- Memory context loading on session start
- Support for custom API keys
- Cross-platform compatibility

### Technical
- Node.js 16+ requirement
- Automated NPM publishing via GitHub Actions
- Comprehensive test suite
- ESLint code quality enforcement
- Multi-OS CI/CD testing

---

## Release Notes

### v1.0.0 - Initial Release

🎉 **Welcome to PAPR CLI!**

The first official release of PAPR Memory-Enhanced Claude CLI brings persistent memory to your AI conversations.

**Key Features:**
- ⚡ **One-command setup**: `npm install -g @papr/cli && papr init`
- 🧠 **Persistent memory**: Remembers your conversations and preferences
- 🎯 **Smart context**: Automatically loads relevant memories at startup
- 🔧 **Vercel AI SDK support**: Specialized migration guidance for v4→v5
- 🎨 **Beautiful interface**: ASCII art and organized context display

**Installation:**
```bash
npm install -g @papr/cli
papr init  # Get your API key from dashboard.papr.ai
papr start
```

**What's Next:**
- Enhanced memory search algorithms
- Custom memory organization
- Team collaboration features
- Plugin ecosystem
- Web dashboard integration

**Support:**
- 📖 [Documentation](https://platform.papr.ai/docs)
- 🐛 [Report Issues](https://github.com/papr-ai/papr-cli/issues)
- 💬 [Join Discord](https://discord.gg/rd4BKfSD)

Thank you for being part of the PAPR community! 🚀