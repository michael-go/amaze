// Arithmetic quiz question generation.
// `ops` is configurable — defaults to all four operations.
export const ALL_OPS = ["+", "-", "×", "÷"];

export function generateQuestion(ops = ALL_OPS) {
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  switch (op) {
    case "+":
      a = 1 + Math.floor(Math.random() * 20);
      b = 1 + Math.floor(Math.random() * 20);
      answer = a + b;
      break;
    case "-":
      a = 5 + Math.floor(Math.random() * 15);
      b = 1 + Math.floor(Math.random() * (a - 1));
      answer = a - b;
      break;
    case "×":
      a = 2 + Math.floor(Math.random() * 9);
      b = 2 + Math.floor(Math.random() * 9);
      answer = a * b;
      break;
    case "÷":
      b = 2 + Math.floor(Math.random() * 9);
      answer = 1 + Math.floor(Math.random() * 10);
      a = b * answer;
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }

  return { text: `${a} ${op} ${b}`, answer };
}
