const Papr = require('@papr/memory').default;
const chalk = require('chalk');

// =============================================================================
// HOLIDAY THEME (inline for standalone execution)
// =============================================================================

// PAPR brand colors
const BLUE_DARK = chalk.hex('#0161E0');
const BLUE_MID = chalk.hex('#0CCDFF');
const CYAN = chalk.hex('#00FEFE');
const WHITE = chalk.white;
const GOLD = chalk.hex('#FFD700');
const SNOW = chalk.hex('#E0FFFF');

/**
 * Check if current date is in the holiday season (Dec 15 - Jan 5)
 */
function isHolidaySeason() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return (month === 11 && day >= 15) || (month === 0 && day <= 5);
}

/**
 * Get the regular PAPR logo
 */
function getRegularLogo() {
  return [
    BLUE_DARK('██████╗ ') + BLUE_MID(' █████╗ ') + BLUE_MID('██████╗ ') + CYAN('██████╗ '),
    BLUE_DARK('██╔══██╗') + BLUE_MID('██╔══██╗') + BLUE_MID('██╔══██╗') + CYAN('██╔══██╗'),
    BLUE_DARK('██████╔╝') + BLUE_MID('███████║') + BLUE_MID('██████╔╝') + CYAN('██████╔╝'),
    BLUE_DARK('██╔═══╝ ') + BLUE_MID('██╔══██║') + BLUE_MID('██╔═══╝ ') + CYAN('██╔══██╗'),
    BLUE_DARK('██║     ') + BLUE_MID('██║  ██║') + BLUE_MID('██║     ') + CYAN('██║  ██║'),
    BLUE_DARK('╚═╝     ') + BLUE_MID('╚═╝  ╚═╝') + BLUE_MID('╚═╝     ') + CYAN('╚═╝  ╚═╝'),
  ];
}

/**
 * Get the holiday-themed PAPR logo with snowflakes
 */
function getHolidayLogo() {
  return [
    SNOW('       *        ') + WHITE('❄') + SNOW('           *        ') + GOLD('✨'),
    GOLD('   ✨') + SNOW('      *          ') + WHITE('❄') + SNOW('              *'),
    SNOW('      ') + BLUE_DARK('██████╗ ') + BLUE_MID(' █████╗ ') + BLUE_MID('██████╗ ') + CYAN('██████╗'),
    SNOW('  *   ') + BLUE_DARK('██╔══██╗') + BLUE_MID('██╔══██╗') + BLUE_MID('██╔══██╗') + CYAN('██╔══██╗') + SNOW('   ') + WHITE('❄'),
    SNOW('      ') + BLUE_DARK('██████╔╝') + BLUE_MID('███████║') + BLUE_MID('██████╔╝') + CYAN('██████╔╝'),
    SNOW('   ') + WHITE('❄') + SNOW('  ') + BLUE_DARK('██╔═══╝ ') + BLUE_MID('██╔══██║') + BLUE_MID('██╔═══╝ ') + CYAN('██╔══██╗') + SNOW('   *'),
    SNOW('      ') + BLUE_DARK('██║     ') + BLUE_MID('██║  ██║') + BLUE_MID('██║     ') + CYAN('██║  ██║'),
    SNOW('  *   ') + BLUE_DARK('╚═╝     ') + BLUE_MID('╚═╝  ╚═╝') + BLUE_MID('╚═╝     ') + CYAN('╚═╝  ╚═╝') + SNOW('   ') + GOLD('✨'),
    WHITE('    ❄') + SNOW('      🎄 ') + GOLD('Happy Holidays!') + SNOW(' 🎄      ') + WHITE('❄'),
    CYAN('         Memory-Enhanced Claude CLI'),
  ];
}

/**
 * Sleep utility for animation
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Play a brief snowfall animation (1-2 seconds)
 */
async function playSnowfallAnimation(duration = 1500) {
  if (!process.stdout.isTTY) return;

  const snowflakes = ['❄', '✨', '*', '·', '°', '❅', '❆'];
  const width = Math.min(process.stdout.columns || 60, 60);
  const height = 10;
  const frames = Math.floor(duration / 100);

  let flakes = [];
  for (let i = 0; i < 20; i++) {
    flakes.push({
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
      char: snowflakes[Math.floor(Math.random() * snowflakes.length)],
      speed: Math.random() > 0.5 ? 1 : 2
    });
  }

  process.stdout.write('\x1B[?25l'); // Hide cursor

  try {
    for (let frame = 0; frame < frames; frame++) {
      process.stdout.write('\x1B[H');

      let buffer = [];
      for (let y = 0; y < height; y++) {
        buffer.push(' '.repeat(width));
      }

      for (let flake of flakes) {
        if (flake.y >= 0 && flake.y < height && flake.x >= 0 && flake.x < width) {
          let lineArr = buffer[Math.floor(flake.y)].split('');
          lineArr[Math.floor(flake.x)] = flake.char;
          buffer[Math.floor(flake.y)] = lineArr.join('');
        }

        flake.y += flake.speed * 0.5;
        if (Math.random() > 0.7) flake.x += Math.random() > 0.5 ? 0.5 : -0.5;

        if (flake.y >= height) {
          flake.y = 0;
          flake.x = Math.floor(Math.random() * width);
        }
        if (flake.x < 0) flake.x = width - 1;
        if (flake.x >= width) flake.x = 0;
      }

      for (let line of buffer) {
        let coloredLine = line
          .replace(/❄/g, WHITE('❄'))
          .replace(/✨/g, GOLD('✨'))
          .replace(/\*/g, SNOW('*'))
          .replace(/·/g, WHITE('·'))
          .replace(/°/g, SNOW('°'))
          .replace(/❅/g, CYAN('❅'))
          .replace(/❆/g, BLUE_MID('❆'));
        process.stdout.write(coloredLine + '\n');
      }

      await sleep(100);
    }
  } finally {
    process.stdout.write('\x1B[?25h'); // Show cursor
    process.stdout.write('\x1B[2J\x1B[H'); // Clear screen
  }
}

// =============================================================================
// SESSION CONTEXT LOADER
// =============================================================================

async function loadSessionContext() {
  try {
    // Check if memory is enabled
    if (process.env.PAPR_MEMORY_ENABLED === 'false') {
      return; // Skip memory context in clean mode
    }

    const apiKey = process.env.PAPR_MEMORY_API_KEY;

    if (!apiKey) {
      console.log('⚠️ PAPR Memory API key not found.');
      console.log('💡 Run: papr init (get your API key from dashboard.papr.ai)');
      console.log('---');
      return;
    }

    const client = new Papr({
      baseURL: process.env.NEXT_PUBLIC_MEMORY_SERVER_URL || 'https://memory.papr.ai',
      timeout: 10000,
      maxRetries: 1,
      logLevel: 'error',
      xAPIKey: apiKey,
      defaultHeaders: {
        'X-Client-Type': 'papr_cli',
        'Accept-Encoding': 'gzip'
      }
    });

    // Parallel searches for comprehensive context
    const [generalResult, vercelResult] = await Promise.all([
      // General context search
      client.memory.search({
        query: 'Find user preferences, coding goals, project priorities, workflow preferences, recent decisions, and important context about current work. Include any settings, configurations, or patterns I should remember.',
        max_memories: 20,
        rank_results: true
      }),

      // Vercel AI SDK v5 tool calling migration search
      client.memory.search({
        query: 'Find information about Vercel AI SDK v5 migration guide specifically for tool calling. Look for breaking changes in tool definitions, function calling patterns, API updates from v4 to v5, tool schema changes, and migration steps for implementing tools and function calling in Vercel AI SDK v5.',
        max_memories: 20,
        rank_results: true
      })
    ]);

    // Display PAPR banner with holiday theme if in season
    console.log('');
    if (isHolidaySeason()) {
      await playSnowfallAnimation();
      const logo = getHolidayLogo();
      logo.forEach(line => console.log(line));
    } else {
      const logo = getRegularLogo();
      logo.forEach(line => console.log(line));
      console.log(CYAN('        Memory-Enhanced Claude CLI'));
    }
    console.log('');
    console.log('🧠 **Session Context:**');

    // Display general memories
    if (generalResult.data?.memories?.length > 0) {
      generalResult.data.memories.forEach((m, i) => {
        const title = m.title || 'Memory';
        const content = m.content.substring(0, 200).replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
        console.log(`${i+1}. ${title}: ${content}...`);
      });
    }

    // Display Vercel AI SDK v5 migration memories
    if (vercelResult.data?.memories?.length > 0) {
      console.log('');
      console.log('🔧 **Vercel AI SDK v5 Tool Calling Migration:**');
      vercelResult.data.memories.forEach((m, i) => {
        const title = m.title || 'Vercel AI SDK Memory';
        const content = m.content.substring(0, 200).replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
        console.log(`${i+1}. ${title}: ${content}...`);
      });
    }

    if (!generalResult.data?.memories?.length && !vercelResult.data?.memories?.length) {
      console.log('📝 Starting fresh session - no relevant memories found');
    }

    console.log('');
    console.log('---');

  } catch (error) {
    console.log('⚠️ Memory service unavailable');
    console.log('---');
  }
}

// Only run if called directly (not in test environment)
if (require.main === module) {
  loadSessionContext();
}

module.exports = { loadSessionContext };