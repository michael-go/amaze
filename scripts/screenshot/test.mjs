// End-to-end smoke tests for the game (dev server must be up).
//
// Usage: node test.mjs [scenario...]   (default: all)
// Scenarios: quiz | pickup | settings | touch | dance
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
  standByLandmark,
  kidDancing,
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
    const cameraProfile = await page.evaluate(() => window.__cameraProfile);
    check(
      !cameraProfile?.isPortrait &&
        cameraProfile?.lookHeight === 1 &&
        cameraProfile?.distance === 2,
      "landscape camera framing remains unchanged",
    );
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

// Verify the mobile joystick has a generous hit target, sends proportional
// movement and steering, keeps tracking outside its edge, and stops on release.
async function testTouchControls() {
  const { browser, page } = await launch({
    test: true,
    touch: true,
    width: 390,
    height: 844,
  });
  try {
    await startGame(page);
    await skipCountdown(page);
    const joystick = await page.$('[data-testid="touch-joystick"]');
    check(joystick, "touch joystick is visible while playing");
    const sourceLinkHidden = await page.$eval(
      ".game-github-link",
      (element) => getComputedStyle(element).display === "none",
    );
    check(
      sourceLinkHidden,
      "gameplay source link does not cover mobile controls",
    );
    const cameraProfile = await page.evaluate(() => window.__cameraProfile);
    check(cameraProfile?.isPortrait, "portrait camera profile is active");
    check(
      cameraProfile.lookHeight > 1.2 && cameraProfile.distance > 2,
      "portrait camera looks farther forward",
    );

    const rect = await joystick.boundingBox();
    check(
      rect.width >= 150 && rect.height >= 150,
      "joystick hit target is large",
    );
    const visibleSize = await joystick.$eval(
      ":scope > div",
      (element) => element.getBoundingClientRect().width,
    );
    check(visibleSize <= 120, "visible joystick stays compact");
    await page.evaluate(() => {
      window.__touchSamples = [];
      window.addEventListener("amaze:touch-control", (event) => {
        window.__touchSamples.push(event.detail);
      });
    });

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    // End beyond the ring to exercise pointer capture as well as clamping.
    await page.mouse.move(cx + 90, cy - 100, { steps: 8 });
    await sleep(100);
    const active = await page.evaluate(() =>
      window.__touchSamples.findLast(
        (sample) => sample.move > 0.4 && sample.turn < -0.2,
      ),
    );
    check(active, "diagonal drag sends forward movement and right steering");
    check(active.move >= 0.75, "walking starts at a brisk speed");

    // Hold longer than the adaptive renderer's idle timeout. Touch movement
    // must keep the game at its smooth active frame rate for the whole walk.
    await sleep(2200);
    const sustainedFps = await page.evaluate(() => window.__amazeTargetFps);
    check(sustainedFps === 60, "sustained touch movement stays at 60fps");
    await page.mouse.up();
    await sleep(50);
    const released = await page.evaluate(() => window.__touchSamples.at(-1));
    check(
      released?.move === 0 && released?.turn === 0,
      "releasing the joystick stops all touch movement",
    );
    console.log("  ✓ large target → proportional drag → captured release");
  } finally {
    await browser.close();
  }
}

async function testLandmarkDance() {
  const { browser, page } = await launch({ test: true });
  try {
    await startGame(page);
    await skipCountdown(page);
    await standByLandmark(page);
    check(await kidDancing(page), "kid dances while standing by a landmark");
    await sleep(5200);
    check(!(await kidDancing(page)), "landmark dance stops after five seconds");

    await page.evaluate(() => {
      const landmark = window.__landmarks[0];
      const nx = Math.sin(landmark.rotY);
      const nz = Math.cos(landmark.rotY);
      window.__playerPosition.set(
        landmark.pos[0] + nx * 5,
        0,
        landmark.pos[2] + nz * 5,
      );
    });
    await sleep(500);
    check(!(await kidDancing(page)), "kid stops dancing away from landmarks");
    await standByLandmark(page);
    check(await kidDancing(page), "a new landmark approach starts a new dance");
    console.log("  ✓ dance → five-second stop → move away → dance again");
  } finally {
    await browser.close();
  }
}

const SCENARIOS = {
  quiz: testQuizKinds,
  pickup: testPickup,
  settings: testSettings,
  touch: testTouchControls,
  dance: testLandmarkDance,
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
