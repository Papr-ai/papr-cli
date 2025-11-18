const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const HOOKS_DIR = path.join(__dirname, '..', 'templates');

async function initPapr(options = {}) {
  let spinner = ora('Setting up PAPR Memory-Enhanced Claude CLI').start();

  try {
    // Check if Claude CLI is installed
    spinner.text = 'Checking Claude CLI installation...';
    await checkClaudeInstallation(spinner);

    // Get configuration from user
    spinner.stop();
    console.log(chalk.blue('📋 Configuration setup:'));
    const config = await getConfiguration(options);
    spinner = ora('Continuing setup...').start();

    // Install dependencies
    spinner.text = 'Installing dependencies...';
    await installDependencies(spinner);

    // Setup Claude configuration directory
    spinner.text = 'Setting up directories...';
    await fs.ensureDir(CLAUDE_DIR);

    // Create or update Claude settings
    spinner.text = 'Configuring settings...';
    await setupClaudeSettings(config, spinner);

    // Copy hook templates
    spinner.text = 'Installing hooks...';
    await setupHooks(spinner);

    // Setup PAPR Memory subagent
    spinner.text = 'Installing PAPR Memory agent...';
    await setupPaprAgent(spinner);

    spinner.succeed(chalk.green('✅ PAPR CLI initialized successfully!'));

    console.log('\\n');
    console.log(chalk.blue('██████╗  █████╗ ██████╗ ██████╗ '));
    console.log(chalk.blue('██╔══██╗██╔══██╗██╔══██╗██╔══██╗'));
    console.log(chalk.blue('██████╔╝███████║██████╔╝██████╔╝'));
    console.log(chalk.blue('██╔═══╝ ██╔══██║██╔═══╝ ██╔══██╗'));
    console.log(chalk.blue('██║     ██║  ██║██║     ██║  ██║'));
    console.log(chalk.blue('╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝'));
    console.log(chalk.green('     🎉 Setup Complete! 🎉'));
    console.log('\\n' + chalk.yellow('Ready to launch:'));
    console.log(chalk.cyan('  papr start') + ' - Launch Claude with memory context');
    console.log(chalk.cyan('  papr status') + ' - Check configuration');
    console.log('\\n' + chalk.gray('📖 Docs: https://platform.papr.ai/docs'));

  } catch (error) {
    spinner.fail(chalk.red(`❌ Initialization failed: ${error.message}`));
    process.exit(1);
  }
}

async function checkClaudeInstallation(spinner) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout checking Claude CLI installation'));
    }, 10000);

    exec('claude --version', { timeout: 5000 }, (error, stdout, stderr) => {
      clearTimeout(timeout);

      if (error) {
        spinner.text = 'Installing Claude CLI...';
        // Install Claude CLI via npm
        const installTimeout = setTimeout(() => {
          reject(new Error('Timeout installing Claude CLI'));
        }, 30000);

        exec('npm install -g @anthropic-ai/claude-code', { timeout: 25000 }, (installError) => {
          clearTimeout(installTimeout);
          if (installError) {
            reject(new Error('Failed to install Claude CLI. Please install manually: npm install -g @anthropic-ai/claude-code'));
          } else {
            resolve();
          }
        });
      } else {
        spinner.text = 'Claude CLI found ✓';
        resolve();
      }
    });
  });
}

async function getConfiguration(options) {
  const questions = [];

  if (!options.apiKey) {
    questions.push({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your PAPR Memory API key (get it from dashboard.papr.ai):',
      validate: (input) => input.length > 0 || 'API key is required'
    });
  }

  let answers = {};
  if (questions.length > 0) {
    answers = await inquirer.prompt(questions);
  }

  return {
    apiKey: options.apiKey || answers.apiKey
  };
}

async function installDependencies(spinner) {
  spinner.text = 'Installing PAPR Memory SDK...';

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout installing @papr/memory SDK'));
    }, 60000); // 60 second timeout for npm install

    exec('npm install -g @papr/memory', { timeout: 55000 }, (error, stdout, stderr) => {
      clearTimeout(timeout);

      if (error) {
        // Check if it's already installed
        exec('npm list -g @papr/memory', (listError, listStdout) => {
          if (!listError && listStdout.includes('@papr/memory')) {
            spinner.text = 'PAPR Memory SDK already installed ✓';
            resolve();
          } else {
            reject(new Error(`Failed to install @papr/memory SDK: ${error.message}`));
          }
        });
      } else {
        spinner.text = 'PAPR Memory SDK installed ✓';
        resolve();
      }
    });
  });
}

async function setupClaudeSettings(config, spinner) {
  spinner.text = 'Configuring Claude CLI settings...';

  let settings = {};

  // Read existing settings if they exist
  if (await fs.pathExists(SETTINGS_FILE)) {
    try {
      settings = await fs.readJson(SETTINGS_FILE);
    } catch (error) {
      // Invalid JSON, start fresh
      settings = {};
    }
  }

  // Add PAPR configuration - Session hooks and MCP tools
  settings.hooks = {
    SessionStart: [{
      matcher: '*',
      hooks: [{
        type: 'command',
        command: `node ${path.join(__dirname, '..', 'templates', 'session-hook.js')}`
      }]
    }]
  };

  // Add MCP server for PAPR Memory tools
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  settings.mcpServers['papr-memory'] = {
    type: 'stdio',
    command: 'node',
    args: [path.join(__dirname, '..', 'templates', 'papr-mcp-server.js')],
    env: {
      PAPR_MEMORY_API_KEY: config.apiKey,
      PAPR_API_KEY: config.apiKey,
      NEXT_PUBLIC_MEMORY_SERVER_URL: 'https://memory.papr.ai'
    }
  };

  settings.env = {
    ...settings.env,
    PAPR_MEMORY_API_KEY: config.apiKey,
    PAPR_API_KEY: config.apiKey,
    NEXT_PUBLIC_MEMORY_SERVER_URL: 'https://memory.papr.ai'
  };

  await fs.writeJson(SETTINGS_FILE, settings, { spaces: 2 });
}

async function setupHooks(spinner) {
  spinner.text = 'Setting up memory hooks and commands...';

  // Verify session hook exists
  const hookFile = path.join(__dirname, '..', 'templates', 'session-hook.js');
  if (!(await fs.pathExists(hookFile))) {
    throw new Error('Session hook template not found');
  }

  // Setup Claude CLI commands directory
  const claudeCommandsDir = path.join(CLAUDE_DIR, 'commands');
  await fs.ensureDir(claudeCommandsDir);

  // Copy command templates
  const commandsSourceDir = path.join(__dirname, '..', 'templates', 'commands');

  if (await fs.pathExists(commandsSourceDir)) {
    await fs.copy(commandsSourceDir, claudeCommandsDir, { overwrite: true });
    spinner.text = 'Memory commands installed ✓';
  }

  spinner.text = 'Memory hooks and commands ready ✓';
}

async function setupPaprAgent(spinner) {
  spinner.text = 'Installing PAPR Memory agent...';

  // Ensure Claude agents directory exists
  const claudeAgentsDir = path.join(CLAUDE_DIR, 'agents');
  await fs.ensureDir(claudeAgentsDir);

  // Find the agent template path
  let agentTemplatePath;

  try {
    // Check if globally installed
    const { stdout } = await new Promise((resolve, reject) => {
      exec('npm list -g @papr/cli --depth=0 2>/dev/null', (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout });
        }
      });
    });

    if (stdout.includes('@papr/cli')) {
      // Get global npm root
      const { stdout: rootStdout } = await new Promise((resolve, reject) => {
        exec('npm root -g', (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout });
          }
        });
      });

      const globalNodeModules = rootStdout.trim();
      agentTemplatePath = path.join(globalNodeModules, '@papr', 'cli', 'templates', 'papr-memory-agent.md');
    } else {
      throw new Error('Not globally installed');
    }
  } catch (error) {
    // Fallback to development/local path
    agentTemplatePath = path.join(__dirname, '..', 'templates', 'papr-memory-agent.md');
  }

  // Verify agent template exists
  if (!(await fs.pathExists(agentTemplatePath))) {
    throw new Error(`PAPR Memory agent template not found at: ${agentTemplatePath}`);
  }

  // Copy all PAPR agents to Claude agents directory
  const agentsToInstall = [
    { source: 'papr-memory-agent.md', target: 'papr-memory-agent.md', name: 'Memory' },
    { source: 'prd-agent.md', target: 'prd-agent.md', name: 'PRD' },
    { source: 'architect-agent.md', target: 'architect-agent.md', name: 'Architect' },
    { source: 'workflow-orchestrator-agent.md', target: 'workflow-orchestrator.md', name: 'Workflow Orchestrator' }
  ];

  const installedAgents = [];

  for (const agent of agentsToInstall) {
    const sourceAgentPath = agentTemplatePath.replace('papr-memory-agent.md', agent.source);
    const targetAgentPath = path.join(claudeAgentsDir, agent.target);

    if (await fs.pathExists(sourceAgentPath)) {
      await fs.copy(sourceAgentPath, targetAgentPath, { overwrite: true });
      installedAgents.push(agent.name);
    }
  }

  if (installedAgents.length > 0) {
    spinner.text = `PAPR agents installed: ${installedAgents.join(', ')} ✓`;
  } else {
    spinner.text = 'PAPR Memory agent installed ✓';
  }
}

async function startClaude(options = {}) {
  console.log(chalk.blue('🧠 Starting PAPR Memory-Enhanced Claude CLI...'));
  console.log(chalk.gray('💡 If prompted about file trust, select "Yes, proceed"\\n'));

  // Set environment variables
  process.env.PAPR_MEMORY_ENABLED = options.memory !== false ? 'true' : 'false';

  // Launch Claude CLI
  const claude = spawn('claude', [], {
    stdio: 'inherit',
    env: { ...process.env },
    cwd: process.cwd()
  });

  claude.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(chalk.red(`\\nClaude CLI exited with code ${code}`));
    }
    process.exit(code || 0);
  });

  claude.on('error', (error) => {
    console.error(chalk.red(`Failed to start Claude CLI: ${error.message}`));
    console.log(chalk.yellow('💡 Try running: papr init'));
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    claude.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    claude.kill('SIGTERM');
  });
}

async function checkStatus() {
  console.log(chalk.blue('🔍 PAPR CLI Status Check'));
  console.log('─'.repeat(40));

  // Check Claude CLI installation
  const claudeInstalled = await new Promise((resolve) => {
    exec('claude --version', (error) => resolve(!error));
  });

  console.log(`Claude CLI: ${claudeInstalled ? chalk.green('✅ Installed') : chalk.red('❌ Not found')}`);

  // Check PAPR Memory SDK
  const paprInstalled = await new Promise((resolve) => {
    exec('npm list -g @papr/memory', (error) => resolve(!error));
  });

  console.log(`PAPR Memory SDK: ${paprInstalled ? chalk.green('✅ Installed') : chalk.red('❌ Not found')}`);

  // Check configuration
  const configExists = await fs.pathExists(SETTINGS_FILE);
  console.log(`Configuration: ${configExists ? chalk.green('✅ Found') : chalk.red('❌ Missing')}`);

  if (configExists) {
    try {
      const settings = await fs.readJson(SETTINGS_FILE);
      const hasHooks = settings.hooks && settings.hooks.SessionStart;
      const hasEnv = settings.env && settings.env.PAPR_MEMORY_API_KEY;

      console.log(`Memory Hooks: ${hasHooks ? chalk.green('✅ Configured') : chalk.red('❌ Missing')}`);
      console.log(`API Key: ${hasEnv ? chalk.green('✅ Set') : chalk.red('❌ Missing')}`);
    } catch (error) {
      console.log(chalk.red('❌ Configuration file corrupted'));
    }
  }

  // Check MCP server status
  const mcpStatus = await checkMcpServer();
  console.log(`MCP Server: ${mcpStatus.status}`);
  if (mcpStatus.details) {
    console.log(`  ${mcpStatus.details}`);
  }

  console.log('─'.repeat(40));

  if (!claudeInstalled || !paprInstalled || !configExists) {
    console.log(chalk.yellow('💡 Run: papr init'));
  } else if (!mcpStatus.working) {
    console.log(chalk.yellow('💡 MCP server needs setup. Try: claude mcp add papr-memory "node /full/path/to/papr-mcp-server.js"'));
  } else {
    console.log(chalk.green('🎉 All systems ready! Run: papr start'));
  }
}

async function checkMcpServer() {
  try {
    // Check if MCP server is registered
    const mcpList = await new Promise((resolve, reject) => {
      exec('claude mcp list', (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });

    if (mcpList.includes('papr-memory')) {
      return {
        status: chalk.green('✅ Registered'),
        working: true,
        details: 'PAPR Memory tools should be available in Claude CLI'
      };
    } else if (mcpList.includes('No MCP servers configured')) {
      return {
        status: chalk.yellow('⚠️ Not registered'),
        working: false,
        details: 'No MCP servers found. Memory tools not available to Claude.'
      };
    } else {
      return {
        status: chalk.yellow('⚠️ Not found'),
        working: false,
        details: 'PAPR Memory server not in MCP list'
      };
    }
  } catch (error) {
    // Test if the MCP server file exists and is runnable
    const mcpServerPath = path.join(__dirname, '..', 'templates', 'papr-mcp-server.js');
    const serverExists = await fs.pathExists(mcpServerPath);

    if (!serverExists) {
      return {
        status: chalk.red('❌ Missing'),
        working: false,
        details: 'MCP server file not found'
      };
    }

    return {
      status: chalk.yellow('⚠️ Unknown'),
      working: false,
      details: 'Could not check MCP status'
    };
  }
}

async function setupMcpServer(config, spinner) {
  spinner.text = 'Registering PAPR Memory MCP server...';

  // Find the correct MCP server path
  let mcpServerPath;

  // Check if globally installed
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      exec('npm list -g @papr/cli --depth=0 2>/dev/null', (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout });
        }
      });
    });

    if (stdout.includes('@papr/cli')) {
      // Get global npm root
      const { stdout: rootStdout } = await new Promise((resolve, reject) => {
        exec('npm root -g', (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout });
          }
        });
      });

      const globalNodeModules = rootStdout.trim();
      mcpServerPath = path.join(globalNodeModules, '@papr', 'cli', 'templates', 'papr-mcp-server.js');
    } else {
      throw new Error('Not globally installed');
    }
  } catch (error) {
    // Fallback to development/local path
    mcpServerPath = path.join(__dirname, '..', 'templates', 'papr-mcp-server.js');
  }

  // Verify MCP server file exists
  if (!(await fs.pathExists(mcpServerPath))) {
    throw new Error(`MCP server template not found at: ${mcpServerPath}`);
  }

  // Read existing settings to modify
  let settings = {};
  if (await fs.pathExists(SETTINGS_FILE)) {
    try {
      settings = await fs.readJson(SETTINGS_FILE);
    } catch (error) {
      settings = {};
    }
  }

  // Add MCP server configuration directly to settings
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  settings.mcpServers['papr-memory'] = {
    type: 'stdio',
    command: 'node',
    args: [mcpServerPath],
    env: {
      PAPR_MEMORY_API_KEY: config.apiKey,
      PAPR_API_KEY: config.apiKey,
      NEXT_PUBLIC_MEMORY_SERVER_URL: 'https://memory.papr.ai'
    }
  };

  // Add PAPR workflow system prompt instructions
  const systemPromptInstructions = `
## PAPR Workflow Orchestration System

When users have PAPR CLI installed, you have access to 4 specialized agents for systematic feature development:

### Automatic Workflow Detection

**For New Feature Requests** (keywords: "implement", "create", "build", "add feature"):
1. Use \`workflow-orchestrator\` agent to coordinate the process
2. Agent will invoke \`prd-agent\` to research memory and create requirements
3. Agent will invoke \`architect-agent\` to analyze codebase and create technical plans
4. Follow the detailed task breakdown with progress tracking

**For Continuing Work** (keywords: "continue", "update", "modify", "keep working"):
1. Use \`papr-memory-agent\` to find existing PRDs, architecture, and task progress
2. Resume implementation from current task status
3. Update task completion in memory as work progresses

### Agent Usage Guidelines

- **workflow-orchestrator**: Complex multi-step feature development, coordination
- **prd-agent**: New features needing requirements documentation and planning
- **architect-agent**: Technical design, codebase analysis, task breakdown
- **papr-memory-agent**: Context search, previous decisions, existing patterns

### Best Practices
1. Always research memory first before starting new work
2. Follow the workflow for complex features (PRD → Architecture → Implementation)
3. Track progress by updating task status in memory
4. Use architect agent's codebase analysis for consistency

Use the Task tool to invoke agents:
\`\`\`
await Task({
  description: "Coordinate feature development",
  prompt: "Manage development of [feature] following systematic workflow",
  subagent_type: "workflow-orchestrator"
});
\`\`\`
`;

  // Add to existing system prompt or create new one
  const existingSystemPrompt = settings.systemPrompt || '';
  settings.systemPrompt = existingSystemPrompt + systemPromptInstructions;

  // Write updated settings
  await fs.writeJson(SETTINGS_FILE, settings, { spaces: 2 });

  spinner.text = 'PAPR Memory MCP server and system prompt registered ✓';
}

async function updateHooks() {
  const spinner = ora('Updating PAPR memory hooks').start();

  try {
    // Copy latest hook templates
    await setupHooks(spinner);

    spinner.succeed(chalk.green('✅ Hooks updated successfully!'));
  } catch (error) {
    spinner.fail(chalk.red(`❌ Update failed: ${error.message}`));
  }
}

async function indexCodebase(directory, options = {}) {
  console.log(chalk.blue('📚 Indexing codebase into PAPR Memory...'));
  console.log(chalk.gray(`Directory: ${directory}\n`));

  const spinner = ora('Initializing code indexer').start();

  try {
    // Check if directory exists
    if (!(await fs.pathExists(directory))) {
      spinner.fail(chalk.red('❌ Directory not found'));
      console.log(chalk.yellow(`Please provide a valid directory path: ${directory}`));
      process.exit(1);
    }

    // Load code indexer
    const { getCodeIndexer } = require('./code-indexer/index');
    const indexer = getCodeIndexer();

    // Initialize schema
    spinner.text = 'Initializing schema...';
    const initResult = await indexer.initialize();
    if (!initResult.success) {
      throw new Error(`Schema initialization failed: ${initResult.error}`);
    }
    spinner.succeed(chalk.green(`✓ Schema ready (${initResult.schemaId})`));

    // Index directory
    spinner.start('Indexing files...');
    const result = await indexer.indexDirectory(directory, {
      includeTests: options.includeTests || false,
      includeGenerated: options.includeGenerated || false
    });

    spinner.stop();

    // Display results
    console.log('\n' + chalk.blue('═'.repeat(60)));
    console.log(chalk.bold('📊 Indexing Results'));
    console.log(chalk.blue('═'.repeat(60)));
    console.log(`${chalk.green('✅ Success:')} ${result.success} files`);
    console.log(`${chalk.yellow('⏭️  Skipped:')} ${result.skipped} files`);
    console.log(`${chalk.red('❌ Failed:')} ${result.failed} files`);

    if (result.success > 0) {
      console.log('\n' + chalk.bold('Indexed Files:'));
      result.indexed.slice(0, 10).forEach(file => {
        console.log(`  ${chalk.cyan('•')} ${path.basename(file.path)} (${file.stats.functions} functions, ${file.stats.classes} classes)`);
      });
      if (result.indexed.length > 10) {
        console.log(`  ${chalk.gray(`...and ${result.indexed.length - 10} more files`)}`);
      }
    }

    if (result.failed > 0) {
      console.log('\n' + chalk.bold.red('Errors:'));
      result.errors.slice(0, 5).forEach(error => {
        console.log(`  ${chalk.red('✗')} ${path.basename(error.path)}: ${error.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ${chalk.gray(`...and ${result.errors.length - 5} more errors`)}`);
      }
    }

    console.log('\n' + chalk.blue('═'.repeat(60)));
    console.log(chalk.green.bold('✅ Indexing complete!'));
    console.log('\n' + chalk.bold('💡 Next steps:'));
    console.log(`  ${chalk.cyan('1.')} Start Claude: ${chalk.white('papr start')}`);
    console.log(`  ${chalk.cyan('2.')} Search code: Use natural language queries like "${chalk.italic('authentication functions')}"`);
    console.log(`  ${chalk.cyan('3.')} Query graph: Use GraphQL tool for structured queries (introspection available)`);

  } catch (error) {
    spinner.fail(chalk.red(`❌ Indexing failed: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = {
  initPapr,
  startClaude,
  checkStatus,
  updateHooks,
  indexCodebase
};