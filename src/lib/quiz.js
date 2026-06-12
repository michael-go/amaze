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
  if (Math.random() < 0.5) {
    const have = randInt(5, 20);
    const cost = randInt(1, have - 1);
    return {
      kind: "money",
      mode: "left",
      x: have,
      y: cost,
      answer: have - cost,
    };
  }
  const a = randInt(2, 10);
  const b = randInt(2, 10);
  return { kind: "money", mode: "total", x: a, y: b, answer: a + b };
}

function clockQuestion() {
  const hour = randInt(1, 12);
  return { kind: "clock", hour, answer: hour };
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
