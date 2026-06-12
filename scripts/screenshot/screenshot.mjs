import {
  launch,
  sleep,
  clickButton,
  BUTTONS,
  startGame,
  skipCountdown,
  setLevaValue,
  spawnItem,
  openMapQuiz,
  solveQuiz,
  screenshot,
} from "./lib.mjs";

const HELP = `
Take automated screenshots of the running game (dev server must be up).

Usage: node screenshot.mjs [options] [out.png]

Options:
  --lang en|he            UI language (default: en)
  --screen SCREEN         title | memorize | playing (default: playing)
  --level N               jump to level N via the #debug panel
  --maze-seed N           set the maze seed via the #debug panel
  --items-seed N          set the items seed via the #debug panel
  --spawn ITEM            spawn a magic item one cell ahead of the player via the
                          debug panel: ghost | fly | trail | steps
                          (walk into it with --hold to trigger the pickup quiz)
                          --spawn and --hold run in the order they appear, so you
                          can turn, spawn, then walk
  --quiz KIND             force a single quiz kind and open the map quiz.
                          Kinds: + - × ÷ missing pattern count halfDouble
                                 twoStep fraction money clock
  --solve                 auto-answer the open quiz before the screenshot
  --settings              open the settings modal (on the title screen)
  --hold KEY:MS[,...]     hold key(s) for MS milliseconds, e.g. ArrowUp:900.
                          Each key is released after its time, except the last
                          one, which stays held through the screenshot (for
                          mid-stride shots)
  --wait MS               extra wait before the screenshot (default: 500)
  --size WxH              viewport size (default: 900x700)
  --crop x,y,w,h          crop the screenshot to a region
  --url URL               game URL (default: http://localhost:5173)
  -o, --out FILE          output file (default: /tmp/amaze.png)
  -h, --help              show this help

Examples:
  node screenshot.mjs /tmp/playing.png
  node screenshot.mjs --screen title --lang he /tmp/title_he.png
  node screenshot.mjs --level 8 --screen memorize /tmp/level8_map.png
  node screenshot.mjs --hold ArrowUp:900 /tmp/walk.png
  node screenshot.mjs --hold ArrowLeft:630 --spawn fly --hold ArrowUp:1200 /tmp/fly_pickup.png
  node screenshot.mjs --quiz clock /tmp/quiz_clock.png
  node screenshot.mjs --quiz clock --solve /tmp/map_unlocked.png
  node screenshot.mjs --settings --lang he /tmp/settings_he.png
`;

function parseArgs(argv) {
  const opts = {
    lang: "en",
    screen: "playing",
    wait: 500,
    size: "900x700",
    url: "http://localhost:5173",
    out: "/tmp/amaze.png",
    actions: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "-h" || a === "--help") {
      console.log(HELP);
      process.exit(0);
    } else if (a === "--lang") opts.lang = next();
    else if (a === "--screen") opts.screen = next();
    else if (a === "--level") opts.level = parseInt(next(), 10);
    else if (a === "--maze-seed") opts.mazeSeed = parseInt(next(), 10);
    else if (a === "--items-seed") opts.itemsSeed = parseInt(next(), 10);
    else if (a === "--spawn") opts.actions.push({ type: "spawn", item: next() });
    else if (a === "--quiz") opts.quiz = next();
    else if (a === "--solve") opts.solve = true;
    else if (a === "--settings") opts.settings = true;
    else if (a === "--hold")
      for (const part of next().split(",")) {
        const [key, ms] = part.split(":");
        opts.actions.push({ type: "hold", key, ms: parseInt(ms, 10) || 500 });
      }
    else if (a === "--wait") opts.wait = parseInt(next(), 10);
    else if (a === "--size") opts.size = next();
    else if (a === "--crop") opts.crop = next();
    else if (a === "--url") opts.url = next();
    else if (a === "-o" || a === "--out") opts.out = next();
    else if (!a.startsWith("-")) opts.out = a;
    else {
      console.error(`Unknown option: ${a}\n${HELP}`);
      process.exit(1);
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const [width, height] = opts.size.split("x").map(Number);
const debug =
  opts.level != null ||
  opts.mazeSeed != null ||
  opts.itemsSeed != null ||
  opts.actions.some((a) => a.type === "spawn");

const { browser, page } = await launch({
  url: opts.url,
  lang: opts.lang,
  quiz: opts.quiz,
  debug,
  test: opts.solve,
  width,
  height,
});
try {
  if (opts.settings) {
    if (!(await clickButton(page, BUTTONS.settings)))
      throw new Error("Settings button not found");
    await sleep(500);
  } else if (opts.screen !== "title") {
    await startGame(page);

    if (opts.screen === "playing" && opts.level == null) {
      await skipCountdown(page);
    }

    if (opts.level != null) {
      // Jumping levels restarts the countdown, so skip it (again) afterwards
      if (opts.screen === "playing") await skipCountdown(page);
      await setLevaValue(page, "Level", opts.level);
      await sleep(2000);
      if (opts.screen === "playing") await skipCountdown(page);
    }

    if (opts.mazeSeed != null) {
      await setLevaValue(page, "Maze Seed", opts.mazeSeed);
      await sleep(2000);
    }
    if (opts.itemsSeed != null) {
      await setLevaValue(page, "Items Seed", opts.itemsSeed);
      await sleep(2000);
    }

    for (const [i, action] of opts.actions.entries()) {
      if (action.type === "spawn") {
        await spawnItem(page, action.item);
      } else {
        await page.keyboard.down(action.key);
        await sleep(action.ms);
        // The final key stays held through the screenshot (mid-stride shots)
        if (i < opts.actions.length - 1) await page.keyboard.up(action.key);
      }
    }

    if (opts.quiz) await openMapQuiz(page);
    if (opts.solve) await solveQuiz(page);
  }

  await sleep(opts.wait);
  await screenshot(page, opts.out, opts.crop);
  console.log(`Screenshot saved to ${opts.out}`);
} finally {
  await browser.close();
}
