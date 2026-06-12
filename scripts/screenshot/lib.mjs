// Shared helpers for driving the game in a headless browser.
// Used by screenshot.mjs (visual iteration) and test.mjs (e2e tests).
import puppeteer from "puppeteer";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Buttons are matched by text so helpers work in either language.
export const BUTTONS = {
  start: /START|CONTINUE|התחילו|המשיכו/,
  topView: /TOP VIEW|מבט על/,
  returnToMaze: /RETURN TO MAZE|לחזור למבוך/,
  settings: /SETTINGS|הגדרות/,
  save: /SAVE|שמירה/,
};

// Launch a headless browser and open the game.
// `quiz`: force a single quiz kind (or pass an array of kinds).
// `debug`: open with the leva debug panel; `test`: enable test hooks
// (window.__quizAnswer) without the panel.
export async function launch({
  url = "http://localhost:5173",
  lang = "en",
  quiz = null,
  debug = false,
  test = false,
  width = 900,
  height = 700,
} = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument(
    (lang, kinds) => {
      localStorage.setItem("amaze:lang", lang);
      if (kinds) localStorage.setItem("amaze:ops", JSON.stringify(kinds));
    },
    lang,
    quiz ? (Array.isArray(quiz) ? quiz : [quiz]) : null,
  );
  const hash = [debug && "debug", test && "test"].filter(Boolean).join("-");
  await page.goto(hash ? `${url}/#${hash}` : url, {
    waitUntil: "networkidle0",
  });
  await sleep(1500);
  return { browser, page };
}

export async function clickButton(page, regex) {
  for (const btn of await page.$$("button")) {
    const text = await btn.evaluate((el) => el.textContent.trim());
    if (regex.test(text)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

export async function buttonVisible(page, regex) {
  for (const btn of await page.$$("button")) {
    const text = await btn.evaluate((el) => el.textContent.trim());
    if (regex.test(text)) return true;
  }
  return false;
}

export async function startGame(page) {
  if (!(await clickButton(page, BUTTONS.start)))
    throw new Error("Start button not found");
  await sleep(1500); // memorize screen (top-down countdown view)
}

export async function skipCountdown(page) {
  await page.keyboard.press("Space");
  await sleep(1500);
}

// Set a numeric input in the leva debug panel, located by its row label.
// Requires launch({debug: true}).
export async function setLevaValue(page, label, value) {
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

// Spawn a magic item one cell ahead of the player via the debug panel.
export async function spawnItem(page, item) {
  const label = { steps: "Steps Refill" }[item] ?? item;
  if (!(await clickButton(page, new RegExp(`^${label}$`, "i"))))
    throw new Error(`Debug spawn button "${label}" not found`);
  await sleep(300);
}

export async function hold(page, key, ms, { release = true } = {}) {
  await page.keyboard.down(key);
  await sleep(ms);
  if (release) await page.keyboard.up(key);
}

// Open the map quiz by clicking the top-view button.
export async function openMapQuiz(page) {
  if (!(await clickButton(page, BUTTONS.topView)))
    throw new Error("Top-view button not found (is the game playing?)");
  await sleep(800);
}

export async function quizOpen(page) {
  return !!(await page.$("input[type=number]"));
}

// The quiz question's correct answer — requires launch({test: true}) or
// {debug: true} (the game only exposes it under those URL hashes).
export async function readQuizAnswer(page) {
  const answer = await page.evaluate(() => window.__quizAnswer);
  if (typeof answer !== "number")
    throw new Error(
      "Quiz answer not exposed — is a quiz open, and was the page launched with {test: true}?",
    );
  return answer;
}

export async function answerQuiz(page, value) {
  const input = await page.$("input[type=number]");
  if (!input) throw new Error("No quiz input on screen");
  await input.click({ clickCount: 3 });
  await input.type(String(value));
  await input.press("Enter");
  await sleep(800);
}

export async function solveQuiz(page) {
  await answerQuiz(page, await readQuizAnswer(page));
}

export async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

// Change the enabled quiz kinds and reload (the game reads them on mount).
// No-op-safe only after launch() without a `quiz` option, which would
// overwrite this on reload.
export async function setQuizKinds(page, kinds) {
  await page.evaluate(
    (kinds) => localStorage.setItem("amaze:ops", JSON.stringify(kinds)),
    kinds,
  );
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(1200);
}

export async function screenshot(page, out, crop) {
  const opts = { path: out };
  if (crop) {
    const [x, y, w, h] = crop.split(",").map(Number);
    opts.clip = { x, y, width: w, height: h };
  }
  await page.screenshot(opts);
}
