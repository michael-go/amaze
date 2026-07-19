// Quiz question generation.
// A question kind is either an arithmetic op (`+ - × ÷`) or an extra type.
// Enabled kinds are configurable in settings — defaults to everything.
export const ALL_OPS = ["+", "-", "×", "÷"];
export const EXTRA_TYPES = [
  "missing",
  "pattern",
  "count",
  "halfDouble",
  "twoStep",
  "fraction",
  "money",
  "clock",
];
export const ALL_TYPES = [...ALL_OPS, ...EXTRA_TYPES];

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const COUNT_EMOJIS = ["🍎", "⭐", "🐟", "🎈", "🦋", "🍪"];
const FRACTIONS = [
  { name: "half", div: 2 },
  { name: "third", div: 3 },
  { name: "quarter", div: 4 },
];

function arithQuestion(op) {
  let a, b, answer;
  switch (op) {
    case "+":
      a = randInt(1, 20);
      b = randInt(1, 20);
      answer = a + b;
      break;
    case "-":
      a = randInt(5, 19);
      b = randInt(1, a - 1);
      answer = a - b;
      break;
    case "×":
      a = randInt(2, 10);
      b = randInt(2, 10);
      answer = a * b;
      break;
    case "÷":
      b = randInt(2, 10);
      answer = randInt(1, 10);
      a = b * answer;
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }
  return { kind: "arith", text: `${a} ${op} ${b}`, answer };
}

function missingQuestion() {
  const op = pick(["+", "-", "×"]);
  let a, b;
  if (op === "+") {
    a = randInt(1, 15);
    b = randInt(1, 15);
    return Math.random() < 0.5
      ? { kind: "missing", text: `? + ${b} = ${a + b}`, answer: a }
      : { kind: "missing", text: `${a} + ? = ${a + b}`, answer: b };
  }
  if (op === "-") {
    a = randInt(5, 19);
    b = randInt(1, a - 1);
    return Math.random() < 0.5
      ? { kind: "missing", text: `? - ${b} = ${a - b}`, answer: a }
      : { kind: "missing", text: `${a} - ? = ${a - b}`, answer: b };
  }
  a = randInt(2, 9);
  b = randInt(2, 9);
  return Math.random() < 0.5
    ? { kind: "missing", text: `? × ${b} = ${a * b}`, answer: a }
    : { kind: "missing", text: `${a} × ? = ${a * b}`, answer: b };
}

function patternQuestion() {
  if (Math.random() < 0.2) {
    const start = randInt(1, 3);
    const terms = [start, start * 2, start * 4, start * 8];
    return {
      kind: "pattern",
      text: `${terms.join(", ")}, ?`,
      answer: start * 16,
    };
  }
  const step = pick([2, 3, 4, 5, 10]);
  const start = randInt(1, 10);
  const terms = [0, 1, 2, 3].map((i) => start + step * i);
  return {
    kind: "pattern",
    text: `${terms.join(", ")}, ?`,
    answer: start + step * 4,
  };
}

function countQuestion() {
  const n = randInt(3, 12);
  const emoji = pick(COUNT_EMOJIS);
  return { kind: "count", emojis: Array(n).fill(emoji).join(" "), answer: n };
}

function halfDoubleQuestion() {
  if (Math.random() < 0.5) {
    const answer = randInt(2, 12);
    return { kind: "halfDouble", mode: "half", n: answer * 2, answer };
  }
  const n = randInt(2, 12);
  return { kind: "halfDouble", mode: "double", n, answer: n * 2 };
}

function twoStepQuestion() {
  const form = randInt(0, 2);
  if (form === 0) {
    const a = randInt(1, 20);
    const b = randInt(2, 9);
    const c = randInt(2, 9);
    return { kind: "arith", text: `${a} + ${b} × ${c}`, answer: a + b * c };
  }
  if (form === 1) {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const c = randInt(1, a * b - 1);
    return { kind: "arith", text: `${a} × ${b} - ${c}`, answer: a * b - c };
  }
  const a = randInt(5, 12);
  const b = randInt(1, a - 1);
  const c = randInt(2, 5);
  return { kind: "arith", text: `(${a} - ${b}) × ${c}`, answer: (a - b) * c };
}

function fractionQuestion() {
  const frac = pick(FRACTIONS);
  const answer = randInt(2, 10);
  return { kind: "fraction", frac: frac.name, n: frac.div * answer, answer };
}

function moneyQuestion() {
  // Work in tenths to avoid floating-point arithmetic while generating values.
  // Fractional prices use elementary-friendly 10-cent/agorot steps.
  const withChange = (min, max) => {
    let units;
    do units = randInt(min, max);
    while (units % 10 === 0);
    return units;
  };
  const whole = (min, max) =>
    randInt(Math.ceil(min / 10), Math.floor(max / 10)) * 10;
  const amountPair = (
    minForFirst,
    maxForFirst,
    minForSecond,
    maxForSecond,
    ordered = false,
  ) => {
    const pattern = pick(["bothChange", "oneWhole", "bothWhole"]);
    const firstIsWhole =
      pattern === "bothWhole" ||
      (pattern === "oneWhole" && Math.random() < 0.5);
    const secondIsWhole =
      pattern === "bothWhole" || (pattern === "oneWhole" && !firstIsWhole);
    const first = (firstIsWhole ? whole : withChange)(minForFirst, maxForFirst);
    const secondMax = ordered
      ? Math.min(maxForSecond, first - 1)
      : maxForSecond;
    const second = (secondIsWhole ? whole : withChange)(
      minForSecond,
      secondMax,
    );
    return [first, second];
  };
  const format = Math.random() < 0.5 ? "words" : "decimal";

  if (Math.random() < 0.5) {
    const [have, cost] = amountPair(51, 200, 11, 100, true);
    return {
      kind: "money",
      mode: "left",
      format,
      x: have / 10,
      y: cost / 10,
      answer: (have - cost) / 10,
    };
  }
  const [a, b] = amountPair(21, 100, 21, 100);
  return {
    kind: "money",
    mode: "total",
    format,
    x: a / 10,
    y: b / 10,
    answer: (a + b) / 10,
  };
}

function clockQuestion() {
  const hour = randInt(1, 12);
  // Not just whole hours: halves often, quarters sometimes
  const minutes = pick([0, 0, 30, 30, 15, 45]);
  // Encoded H*100+M so the e2e harness can pass the answer as one number
  return { kind: "clock", hour, minutes, answer: hour * 100 + minutes };
}

export function generateQuestion(enabled = ALL_TYPES) {
  const kinds = enabled.filter((k) => ALL_TYPES.includes(k));
  const kind = kinds.length ? pick(kinds) : "+";
  switch (kind) {
    case "missing":
      return missingQuestion();
    case "pattern":
      return patternQuestion();
    case "count":
      return countQuestion();
    case "halfDouble":
      return halfDoubleQuestion();
    case "twoStep":
      return twoStepQuestion();
    case "fraction":
      return fractionQuestion();
    case "money":
      return moneyQuestion();
    case "clock":
      return clockQuestion();
    default:
      return arithQuestion(kind);
  }
}
