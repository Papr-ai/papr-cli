/**
 * Ramadan Theme for PAPR CLI
 *
 * Minimalist, elegant Ramadan experience for the terminal.
 * Design philosophy: Apple simplicity meets developer aesthetic.
 *
 * Active: ~February 17 - March 21, 2026 (Ramadan 1447 AH)
 *
 * Features:
 * - Clean crescent moon ASCII art reveal
 * - Twinkling starfield animation
 * - Papr brand colors (#0161E0, #0CCDFF, #00FEFE)
 * - Countdown to Eid al-Fitr
 */

const chalk = require('chalk');

// Papr brand color palette
const PAPR_BLUE = chalk.hex('#0161E0');
const LIGHT_BLUE = chalk.hex('#0CCDFF');
const CYAN = chalk.hex('#00FEFE');
const DIM_BLUE = chalk.hex('#034B9E');
const DIM = chalk.hex('#555555');
const SOFT_WHITE = chalk.hex('#AAAAAA');
const BRIGHT = chalk.hex('#EEEEEE');

// Ramadan 2026 approximate dates (Ramadan 1447 AH)
const RAMADAN_START = new Date(2026, 1, 17); // Feb 17, 2026
const EID_AL_FITR = new Date(2026, 2, 20);   // Mar 20, 2026 (Eid al-Fitr)
const SEASON_END = new Date(2026, 2, 21);     // Mar 21, 2026 (include Eid day)

/**
 * Check if current date is during Ramadan season
 */
function isRamadanSeason() {
  const now = new Date();
  return now >= RAMADAN_START && now <= SEASON_END;
}

/**
 * Get days remaining until Eid al-Fitr
 */
function getDaysUntilEid() {
  const now = new Date();
  const diffTime = EID_AL_FITR.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// ─── Crescent moon ASCII art ───────────────────────────────
// Clean geometric crescent using Unicode block elements
const CRESCENT_ART = [
  '           ▄▄███▄▄',
  '         ▄█▀     ▀▀▀',
  '        ██',
  '       ██',
  '       ██',
  '        ██',
  '         ▀█▄     ▄▄▄',
  '           ▀▀███▀▀',
];

// Star positions for the starfield (hand-placed for visual balance)
const STAR_MAP = [
  { x: 3,  y: 0,  char: '·' },
  { x: 22, y: 0,  char: '*' },
  { x: 45, y: 0,  char: '·' },
  { x: 12, y: 1,  char: '*' },
  { x: 38, y: 1,  char: '·' },
  { x: 52, y: 1,  char: '*' },
  { x: 7,  y: 2,  char: '·' },
  { x: 48, y: 2,  char: '·' },
  { x: 2,  y: 4,  char: '·' },
  { x: 50, y: 4,  char: '*' },
  { x: 5,  y: 6,  char: '*' },
  { x: 47, y: 6,  char: '·' },
  { x: 10, y: 8,  char: '·' },
  { x: 42, y: 8,  char: '*' },
  { x: 55, y: 8,  char: '·' },
  { x: 3,  y: 9,  char: '*' },
  { x: 30, y: 9,  char: '·' },
  { x: 50, y: 10, char: '·' },
  { x: 15, y: 10, char: '*' },
  { x: 8,  y: 11, char: '·' },
  { x: 40, y: 11, char: '*' },
];

/**
 * Get the Ramadan-themed PAPR logo
 * Clean, minimal, centered design
 */
function getRamadanLogo() {
  const daysLeft = getDaysUntilEid();

  const countdownText = daysLeft > 0
    ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until Eid`
    : 'Eid Mubarak!';

  return [
    DIM('         ·            *         ·'),
    DIM('    *         ·              ·'),
    '',
    CYAN('                     ▄▄███▄▄'),
    CYAN('                   ▄█▀     ▀▀▀'),
    CYAN('                  ██'),
    CYAN('                 ██'),
    CYAN('                 ██'),
    CYAN('                  ██'),
    CYAN('                   ▀█▄     ▄▄▄'),
    CYAN('                     ▀▀███▀▀'),
    '',
    '       ' + PAPR_BLUE('██████╗  █████╗ ██████╗ ██████╗'),
    '       ' + PAPR_BLUE('██╔══██╗██╔══██╗██╔══██╗██╔══██╗'),
    '       ' + PAPR_BLUE('██████╔╝███████║██████╔╝██████╔╝'),
    '       ' + PAPR_BLUE('██╔═══╝ ██╔══██║██╔═══╝ ██╔══██╗'),
    '       ' + PAPR_BLUE('██║     ██║  ██║██║     ██║  ██║'),
    '       ' + PAPR_BLUE('╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝'),
    '',
    '              ' + LIGHT_BLUE('Ramadan Kareem'),
    '             ' + DIM_BLUE(countdownText),
    '',
    '         ' + LIGHT_BLUE('Memory-Enhanced Claude CLI'),
  ];
}

/**
 * Sleep utility for animation
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Play an elegant night sky animation
 *
 * Phase 0: Complete darkness - black screen, nothing visible
 * Phase 1: Crescent moon slowly emerges from the dark (glow effect)
 * Phase 2: Stars fade in around the crescent
 * Phase 3: Shooting star streaks from bottom-left to top-right
 * Phase 4: "Ramadan Kareem" types in below
 *
 * Total: ~4 seconds - cinematic, atmospheric, intentional
 */
async function playStarryNightAnimation(duration = 4000) {
  if (!process.stdout.isTTY) return;

  const width = Math.min(process.stdout.columns || 60, 60);
  const height = 15;
  const centerX = Math.floor(width / 2);

  process.stdout.write('\x1B[?25l\x1B[2J\x1B[H');

  // Pre-compute crescent cell positions
  const moonY = 2;
  // Match the hardcoded position in getRamadanLogo() so the crescent
  // doesn't visually jump when the animation ends and the logo appears.
  // CRESCENT_ART line 0 has 11 leading spaces; logo line has 21 → offset = 10.
  const moonX = 10;
  const crescentMap = new Map(); // 'x,y' -> char

  for (let i = 0; i < CRESCENT_ART.length; i++) {
    for (let j = 0; j < CRESCENT_ART[i].length; j++) {
      if (CRESCENT_ART[i][j] !== ' ') {
        const x = moonX + j, y = moonY + i;
        if (x < width && y < height) {
          crescentMap.set(`${x},${y}`, CRESCENT_ART[i][j]);
        }
      }
    }
  }

  // Pre-compute star positions as a map
  const starMap = new Map(); // 'x,y' -> char
  for (const s of STAR_MAP) {
    if (s.y < height && s.x < width) {
      starMap.set(`${s.x},${s.y}`, s.char);
    }
  }

  // Frame renderer - composites all layers and writes to terminal
  function render({ crescentColor, showStars, shootingTrail, text }) {
    process.stdout.write('\x1B[H');
    const lines = [];

    for (let r = 0; r < height; r++) {
      let line = '';
      for (let c = 0; c < width; c++) {
        const key = `${c},${r}`;

        // Layer 1 (top): Shooting star overlay
        if (shootingTrail) {
          const ss = shootingTrail.get(key);
          if (ss) { line += ss.color(ss.char); continue; }
        }

        // Layer 2: Crescent moon
        if (crescentColor) {
          const ch = crescentMap.get(key);
          if (ch) { line += crescentColor(ch); continue; }
        }

        // Layer 3: Stars
        if (showStars) {
          const ch = starMap.get(key);
          if (ch) { line += (ch === '*' ? SOFT_WHITE : DIM)(ch); continue; }
        }

        // Layer 4: Text
        if (text && r === text.y) {
          const ti = c - text.x;
          if (ti >= 0 && ti < text.len) {
            line += LIGHT_BLUE(text.str[ti]);
            continue;
          }
        }

        line += ' ';
      }
      lines.push(line);
    }

    process.stdout.write(lines.join('\n') + '\n');
  }

  try {
    // ── Phase 0: Complete darkness ──────────────────────────
    // The screen is black. Nothing. Like the night before moon-sighting.
    await sleep(800);

    // ── Phase 1: Crescent emerges from darkness ─────────────
    // Glow stages: barely visible → dim blue hint → brightening → full cyan
    const glowStages = [
      chalk.hex('#050510'),
      chalk.hex('#0A1525'),
      chalk.hex('#112A44'),
      chalk.hex('#1A4466'),
      chalk.hex('#0D6688'),
      chalk.hex('#0CAADD'),
      chalk.hex('#0CCDFF'),
      CYAN,
    ];

    for (const color of glowStages) {
      render({ crescentColor: color });
      await sleep(250);
    }

    await sleep(300);

    // ── Phase 2: Stars fade in around the crescent ──────────
    // Stars appear in small batches, like eyes adjusting to the night
    const visibleStars = new Map();
    for (let i = 0; i < STAR_MAP.length; i++) {
      const s = STAR_MAP[i];
      if (s.y < height && s.x < width) {
        visibleStars.set(`${s.x},${s.y}`, s.char);
      }
      if (i % 3 === 0 || i === STAR_MAP.length - 1) {
        render({ crescentColor: CYAN, showStars: visibleStars });
        await sleep(40);
      }
    }

    await sleep(250);

    // ── Phase 3: Shooting star from bottom-left to top-right ─
    // Calculate diagonal path across the sky
    const ssSteps = 16;
    const ssPath = [];
    for (let s = 0; s <= ssSteps; s++) {
      const t = s / ssSteps;
      ssPath.push({
        x: Math.round(2 + (width - 7) * t),
        y: Math.round((height - 2) - (height - 3) * t),
      });
    }

    // Trail definition: head is bright, tail fades through blues
    const trailSpec = [
      { char: '*', color: BRIGHT },
      { char: '*', color: LIGHT_BLUE },
      { char: '·', color: DIM_BLUE },
      { char: '·', color: DIM },
    ];

    for (let frame = 0; frame < ssPath.length + trailSpec.length; frame++) {
      const trail = new Map();
      for (let t = 0; t < trailSpec.length; t++) {
        const idx = frame - t;
        if (idx >= 0 && idx < ssPath.length) {
          const p = ssPath[idx];
          const key = `${p.x},${p.y}`;
          if (!trail.has(key)) { // head takes priority over tail
            trail.set(key, { char: trailSpec[t].char, color: trailSpec[t].color });
          }
        }
      }

      render({
        crescentColor: CYAN,
        showStars: visibleStars,
        shootingTrail: trail,
      });
      await sleep(50);
    }

    // Render without shooting star to clean up
    render({ crescentColor: CYAN, showStars: visibleStars });
    await sleep(300);

    // ── Phase 4: "Ramadan Kareem" types in ──────────────────
    const txt = 'Ramadan Kareem';
    const textY = moonY + CRESCENT_ART.length + 1;
    // Match the position in getRamadanLogo() (14 leading spaces)
    const textX = 14;

    for (let i = 1; i <= txt.length; i++) {
      render({
        crescentColor: CYAN,
        showStars: visibleStars,
        text: { str: txt.substring(0, i), x: textX, y: textY, len: i },
      });
      await sleep(60);
    }

    await sleep(800);

  } finally {
    process.stdout.write('\x1B[?25h\x1B[2J\x1B[H');
  }
}

module.exports = {
  isRamadanSeason,
  getDaysUntilEid,
  getRamadanLogo,
  playStarryNightAnimation,
  colors: {
    PAPR_BLUE,
    LIGHT_BLUE,
    CYAN,
    DIM_BLUE,
    DIM,
    SOFT_WHITE,
    BRIGHT
  }
};
