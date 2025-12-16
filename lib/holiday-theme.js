/**
 * Holiday Theme for PAPR CLI
 *
 * Displays festive ASCII art with PAPR brand colors during the holiday season.
 * Active: December 15 - January 5
 *
 * Features:
 * - Snowflake decorations around PAPR logo
 * - PAPR brand gradient colors (#0161E0 → #0CCDFF → #00FEFE)
 * - Brief snowfall animation
 */

const chalk = require('chalk');

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
  const month = now.getMonth(); // 0-indexed (11 = December, 0 = January)
  const day = now.getDate();
  // Holiday season: December 15 - January 5
  return (month === 11 && day >= 15) || (month === 0 && day <= 5);
}

/**
 * Get the regular PAPR logo (non-holiday)
 * Returns array of colored strings
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
 * Returns array of colored strings - uses consistent CYAN color for all letters
 */
function getHolidayLogo() {
  const snow = SNOW;
  const sparkle = GOLD;

  return [
    snow('       *        ') + WHITE('❄') + snow('           *        ') + sparkle('✨'),
    sparkle('   ✨') + snow('      *          ') + WHITE('❄') + snow('              *'),
    snow('      ') + CYAN('██████╗  █████╗ ██████╗ ██████╗'),
    snow('  *   ') + CYAN('██╔══██╗██╔══██╗██╔══██╗██╔══██╗') + snow('   ') + WHITE('❄'),
    snow('      ') + CYAN('██████╔╝███████║██████╔╝██████╔╝'),
    snow('   ') + WHITE('❄') + snow('  ') + CYAN('██╔═══╝ ██╔══██║██╔═══╝ ██╔══██╗') + snow('   *'),
    snow('      ') + CYAN('██║     ██║  ██║██║     ██║  ██║'),
    snow('  *   ') + CYAN('╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝') + snow('   ') + sparkle('✨'),
    WHITE('    ❄') + snow('      🎄 ') + GOLD('Happy Holidays!') + snow(' 🎄      ') + WHITE('❄'),
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
 * Uses ANSI escape codes for cursor positioning
 */
async function playSnowfallAnimation(duration = 1500) {
  // Check if stdout supports cursor positioning
  if (!process.stdout.isTTY) {
    return; // Skip animation if not a TTY
  }

  const snowflakes = ['❄', '✨', '*', '·', '°', '❅', '❆'];
  const width = Math.min(process.stdout.columns || 60, 60);
  const height = 10;
  const frames = Math.floor(duration / 100); // 10fps

  // Create falling snowflakes
  let flakes = [];
  for (let i = 0; i < 20; i++) {
    flakes.push({
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
      char: snowflakes[Math.floor(Math.random() * snowflakes.length)],
      speed: Math.random() > 0.5 ? 1 : 2
    });
  }

  // Hide cursor during animation
  process.stdout.write('\x1B[?25l');

  try {
    // Animation loop
    for (let frame = 0; frame < frames; frame++) {
      // Move cursor to top-left
      process.stdout.write('\x1B[H');

      // Build frame buffer
      let buffer = [];
      for (let y = 0; y < height; y++) {
        let line = ' '.repeat(width);
        buffer.push(line);
      }

      // Place snowflakes
      for (let flake of flakes) {
        if (flake.y >= 0 && flake.y < height && flake.x >= 0 && flake.x < width) {
          let lineArr = buffer[Math.floor(flake.y)].split('');
          lineArr[Math.floor(flake.x)] = flake.char;
          buffer[Math.floor(flake.y)] = lineArr.join('');
        }

        // Move flake down
        flake.y += flake.speed * 0.5;

        // Drift horizontally
        if (Math.random() > 0.7) {
          flake.x += Math.random() > 0.5 ? 0.5 : -0.5;
        }

        // Wrap around
        if (flake.y >= height) {
          flake.y = 0;
          flake.x = Math.floor(Math.random() * width);
        }
        if (flake.x < 0) flake.x = width - 1;
        if (flake.x >= width) flake.x = 0;
      }

      // Render frame with colors
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
    // Show cursor again
    process.stdout.write('\x1B[?25h');
    // Clear screen for logo
    process.stdout.write('\x1B[2J\x1B[H');
  }
}

/**
 * Display the appropriate logo based on season
 * @param {boolean} animate - Whether to play animation (for papr start)
 */
async function displayLogo(animate = false) {
  if (isHolidaySeason()) {
    if (animate) {
      await playSnowfallAnimation();
    }
    const logo = getHolidayLogo();
    console.log('');
    logo.forEach(line => console.log(line));
  } else {
    const logo = getRegularLogo();
    console.log('');
    logo.forEach(line => console.log(line));
  }
}

module.exports = {
  isHolidaySeason,
  getRegularLogo,
  getHolidayLogo,
  playSnowfallAnimation,
  displayLogo,
  // Export colors for use in other files
  colors: {
    BLUE_DARK,
    BLUE_MID,
    CYAN,
    WHITE,
    GOLD,
    SNOW
  }
};
