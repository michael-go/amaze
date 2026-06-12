# Screenshot tool

Headless-browser screenshots of the running game, for visual iteration
without manual interaction.

## Setup (one-time)

```
cd scripts/screenshot && npm install
```

## Usage

Start the dev server first (`npm run dev` in the project root), then:

```
node scripts/screenshot/screenshot.mjs [options] [out.png]
```

Run with `--help` for all options. Common scenarios:

```bash
# Default: start the game, skip the countdown, shoot the playing view
node screenshot.mjs /tmp/playing.png

# Title screen, Hebrew UI
node screenshot.mjs --screen title --lang he /tmp/title_he.png

# Top-down memorize view of level 8 (uses the #debug leva panel)
node screenshot.mjs --level 8 --screen memorize /tmp/level8_map.png

# Mid-stride walking shot (key is held while the screenshot is taken)
node screenshot.mjs --hold ArrowUp:900 /tmp/walk.png

# Turn 90° left, spawn a magic item one cell ahead (debug panel), then walk
# into it → the pickup quiz appears. --spawn / --hold run in the given order.
node screenshot.mjs --hold ArrowLeft:630 --spawn fly --hold ArrowUp:1200 /tmp/fly_pickup.png

# Force a specific quiz kind and open the map quiz
node screenshot.mjs --quiz clock /tmp/quiz_clock.png
node screenshot.mjs --quiz money --lang he /tmp/quiz_money_he.png

# Settings modal
node screenshot.mjs --settings --lang he /tmp/settings_he.png

# Crop to a region (x,y,width,height)
node screenshot.mjs --crop 300,200,400,300 /tmp/cropped.png
```

## Iteration loop

1. Edit source files (Vite hot-reloads automatically)
2. Run the script to get a fresh screenshot
3. View the screenshot (e.g. with the Read tool in Claude Code)
4. Repeat until satisfied
