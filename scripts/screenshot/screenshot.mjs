import puppeteer from "puppeteer";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Buttons are matched by text so the script works in either language.
const BUTTON_TEXT = {
  start: /START|CONTINUE|התחילו|המשיכו/,
  topView: /TOP VIEW|מבט על/,
  settings: /SETTINGS|הגדרות/,
};

async function clickButton(page, regex) {
  for (const btn of await page.$$("button")) {
    const text = await btn.evaluate((el) => el.textContent.trim());
    if (regex.test(text)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

// Set a numeric input in the leva debug panel, located by its row label.
async function setLevaValue(page, label, value) {
  const handle = await page.evaluateHandle((label) => {
    const el = [...document.querySelectorAll("label")].find(
      (l) => l.textContent.trim() === label,
    );
    if (!el) return null;
    return el.htmlFor
      ? document.getElementById(el.htmlFor)
      : el.parentElement?.querySelector("input");
  }, label);
  const input = handle.asElement();
  if (!input) throw new Error(`Debug panel input "${label}" not found`);
  await input.click({ clickCount: 3 });
  await input.type(String(value), { delay: 30 });
  await input.press("Enter");
}

const opts = parseArgs(process.argv.slice(2));
const [width, height] = opts.size.split("x").map(Number);
const needsDebug =
  opts.level != null ||
  opts.mazeSeed != null ||
  opts.itemsSeed != null ||
  opts.actions.some((a) => a.type === "spawn");

const browser = await puppeteer.launch({
  headless: true,
  args: ["--enable-webgl", "--use-gl=angle"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  await page.evaluateOnNewDocument(
    (lang, quiz) => {
      localStorage.setItem("amaze:lang", lang);
      if (quiz) localStorage.setItem("amaze:ops", JSON.stringify([quiz]));
    },
    opts.lang,
    opts.quiz ?? null,
  );

  const url = needsDebug ? `${opts.url}/#debug` : opts.url;
  await page.goto(url, { waitUntil: "networkidle0" });
  await sleep(1500);

  if (opts.settings) {
    if (!(await clickButton(page, BUTTON_TEXT.settings)))
      throw new Error("Settings button not found");
    await sleep(500);
  } else if (opts.screen !== "title") {
    if (!(await clickButton(page, BUTTON_TEXT.start)))
      throw new Error("Start button not found");
    await sleep(1500); // memorize screen (top-down countdown view)

    if (opts.screen === "playing" && opts.level == null) {
      await page.keyboard.press("Space"); // skip countdown
      await sleep(1500);
    }

    if (opts.level != null) {
      // Jumping levels restarts the countdown, so skip it (again) afterwards
      if (opts.screen === "playing") {
        await page.keyboard.press("Space");
        await sleep(1000);
      }
      await setLevaValue(page, "Level", opts.level);
      await sleep(2000);
      if (opts.screen === "playing") {
        await page.keyboard.press("Space");
        await sleep(1500);
      }
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
        const label = { steps: "Steps Refill" }[action.item] ?? action.item;
        const regex = new RegExp(`^${label}$`, "i");
        if (!(await clickButton(page, regex)))
          throw new Error(`Debug spawn button "${label}" not found`);
        await sleep(300);
      } else {
        await page.keyboard.down(action.key);
        await sleep(action.ms);
        // The final key stays held through the screenshot (mid-stride shots)
        if (i < opts.actions.length - 1) await page.keyboard.up(action.key);
      }
    }

    if (opts.quiz) {
      if (!(await clickButton(page, BUTTON_TEXT.topView)))
        throw new Error("Top-view button not found (is the game playing?)");
      await sleep(800);
    }
  }

  await sleep(opts.wait);
  const shot = { path: opts.out };
  if (opts.crop) {
    const [x, y, w, h] = opts.crop.split(",").map(Number);
    shot.clip = { x, y, width: w, height: h };
  }
  await page.screenshot(shot);
  console.log(`Screenshot saved to ${opts.out}`);
} finally {
  await browser.close();
}
