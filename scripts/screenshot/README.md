# Screenshot & e2e test tools

Headless-browser tooling for the running game:

- `screenshot.mjs` — screenshots of any game state, for visual iteration
- `test.mjs` — end-to-end smoke tests with assertions
- `lib.mjs` — shared game-driving helpers both are built on

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

# Auto-answer the open quiz first (e.g. to capture the unlocked map view)
node screenshot.mjs --quiz clock --solve /tmp/map_unlocked.png

# Settings modal
node screenshot.mjs --settings --lang he /tmp/settings_he.png

# Crop to a region (x,y,width,height)
node screenshot.mjs --crop 300,200,400,300 /tmp/cropped.png
```

## End-to-end tests

```bash
node test.mjs                 # all scenarios
node test.mjs quiz            # one scenario: quiz | pickup | settings
```

Scenarios:

- **quiz** — for every quiz kind (the four ops + the eight extra types):
  open the map quiz, verify a wrong answer is rejected with a message, then
  verify the correct answer closes the modal and unlocks the top view
- **pickup** — spawn a magic item, walk into it, solve the pickup quiz, and
  verify the power banner appears
- **settings** — toggle a quiz type, save, and verify it persists

Exit code is non-zero on failure, so it can gate scripts/CI.

The correct quiz answer comes from a test hook: when the page is loaded with
a `#test` or `#debug` hash, `QuizModal` exposes `window.__quizAnswer`.
`lib.mjs` exports the building blocks (launch, startGame, openMapQuiz,
solveQuiz, spawnItem, hold, ...) for writing new scenarios or one-off
verification scripts.

## Iteration loop

1. Edit source files (Vite hot-reloads automatically)
2. Run the script to get a fresh screenshot
3. View the screenshot (e.g. with the Read tool in Claude Code)
4. Repeat until satisfied
