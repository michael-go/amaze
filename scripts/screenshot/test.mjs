// End-to-end smoke tests for the game (dev server must be up).
//
// Usage: node test.mjs [scenario...]   (default: all)
// Scenarios: quiz | pickup | settings
import { ALL_TYPES } from "../../src/lib/quiz.js";
import {
  launch,
  sleep,
  clickButton,
  buttonVisible,
  BUTTONS,
  startGame,
  skipCountdown,
  spawnItem,
  hold,
  openMapQuiz,
  quizOpen,
  readQuizAnswer,
  answerQuiz,
  solveQuiz,
  bodyText,
  setQuizKinds,
} from "./lib.mjs";

function check(cond, msg) {
  if (!cond) throw new Error(`check failed: ${msg}`);
}

// Every quiz kind: open the map quiz, verify a wrong answer is rejected,
// then verify the correct answer unlocks the top view.
async function testQuizKinds() {
  const { browser, page } = await launch({ test: true });
  try {
    for (const kind of ALL_TYPES) {
      await setQuizKinds(page, [kind]);
      await startGame(page);
      await skipCountdown(page);
      await openMapQuiz(page);
      check(await quizOpen(page), `[${kind}] quiz modal opened`);

      const answer = await readQuizAnswer(page);
      await answerQuiz(page, answer + 1);
      check(await quizOpen(page), `[${kind}] wrong answer keeps quiz open`);
      check(
        /Not quite|לא מדויק/.test(await bodyText(page)),
        `[${kind}] wrong-answer message shown`,
      );

      await answerQuiz(page, answer);
      check(!(await quizOpen(page)), `[${kind}] correct answer closes quiz`);
      check(
        await buttonVisible(page, BUTTONS.returnToMaze),
        `[${kind}] top view unlocked`,
      );
      console.log(`  ✓ ${kind}`);
    }
  } finally {
    await browser.close();
  }
}

// Spawn a magic item, walk into it, solve the pickup quiz, and verify the
// power activates (HUD banner). Uses the known level-1 layout: the player
// starts facing a wall with an open corridor 90° to the left.
async function testPickup() {
  const { browser, page } = await launch({ debug: true, test: true });
  try {
    await startGame(page);
    await skipCountdown(page);
    await hold(page, "ArrowLeft", 630);
    await spawnItem(page, "fly");
    await hold(page, "ArrowUp", 1200);
    check(await quizOpen(page), "pickup quiz opened on walking into item");

    await solveQuiz(page);
    await sleep(1000);
    check(!(await quizOpen(page)), "pickup quiz closed");
    check(
      /Fly|ריחוף/.test(await bodyText(page)),
      "fly power banner shown after pickup",
    );
    console.log("  ✓ spawn → walk → solve → power active");
  } finally {
    await browser.close();
  }
}

// Toggle a quiz type in settings and verify it persists to localStorage.
async function testSettings() {
  const { browser, page } = await launch();
  try {
    if (!(await clickButton(page, BUTTONS.settings)))
      throw new Error("Settings button not found");
    await sleep(500);
    check(
      await clickButton(page, /Money|כסף/),
      "money toggle present in settings",
    );
    await clickButton(page, BUTTONS.save);
    await sleep(500);
    const disabled = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("amaze:opsDisabled")),
    );
    check(disabled.includes("money"), "toggled-off type saved to localStorage");
    check(!disabled.includes("+"), "still-enabled kinds not disabled");
    console.log("  ✓ settings toggle persists");
  } finally {
    await browser.close();
  }
}

const SCENARIOS = {
  quiz: testQuizKinds,
  pickup: testPickup,
  settings: testSettings,
};
const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(SCENARIOS);

let failed = 0;
for (const name of names) {
  const fn = SCENARIOS[name];
  if (!fn) {
    console.error(
      `Unknown scenario: ${name} (have: ${Object.keys(SCENARIOS).join(", ")})`,
    );
    process.exit(1);
  }
  console.log(`▶ ${name}`);
  try {
    await fn();
    console.log(`✓ ${name} passed`);
  } catch (err) {
    console.error(`✗ ${name} FAILED: ${err.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
