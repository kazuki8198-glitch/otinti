// tools/lib/expr.mjs — a small, safe arithmetic evaluator for calc-check (no eval: a recursive-descent parser).
// Numbers (1,091 is not allowed: write 1091), + - * / ^ (power), parentheses, variables, and the functions below.
// Trigonometry: sin/cos/tan take radians; sind/cosd/tand take degrees; asind/acosd/atand return degrees.
const F = {
  sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max, pow: Math.pow,
  log: Math.log, log10: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sind: d => Math.sin(d * Math.PI / 180), cosd: d => Math.cos(d * Math.PI / 180), tand: d => Math.tan(d * Math.PI / 180),
  asind: x => Math.asin(x) * 180 / Math.PI, acosd: x => Math.acos(x) * 180 / Math.PI, atand: x => Math.atan(x) * 180 / Math.PI,
  roundto: (x, n) => Math.round(x * 10 ** n) / 10 ** n,
};
const K = { pi: Math.PI, e: Math.E };

export function evaluate(src, vars = {}) {
  const s = String(src); let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const peek = () => { ws(); return s[i]; };
  const fail = m => { throw new Error(`${m} at ${i} in "${s}"`); };
  function primary() {
    const c = peek();
    if (c === '(') { i++; const v = expr(); if (peek() !== ')') fail('expected )'); i++; return v; }
    if (c === '-') { i++; return -power(); }
    if (c === '+') { i++; return power(); }
    const num = s.slice(i).match(/^(\d+(?:\.\d+)?(?:e[+-]?\d+)?|\.\d+)/i);
    if (num) { i += num[0].length; return Number(num[0]); }
    const id = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (id) {
      i += id[0].length; const name = id[0];
      if (peek() === '(') {
        i++; const args = [];
        if (peek() !== ')') { args.push(expr()); while (peek() === ',') { i++; args.push(expr()); } }
        if (peek() !== ')') fail('expected )'); i++;
        if (!Object.prototype.hasOwnProperty.call(F, name)) fail(`unknown function ${name}`);
        return F[name](...args);
      }
      if (Object.prototype.hasOwnProperty.call(vars, name)) return Number(vars[name]);
      if (Object.prototype.hasOwnProperty.call(K, name)) return K[name];
      fail(`unknown name ${name}`);
    }
    fail('unexpected ' + (c || 'end'));
  }
  function power() { const b = primary(); if (peek() === '^') { i++; return b ** unary(); } return b; }
  function unary() { if (peek() === '-') { i++; return -unary(); } return power(); }
  function term() { let v = unary(); for (;;) { const c = peek(); if (c === '*') { i++; v *= unary(); } else if (c === '/') { i++; v /= unary(); } else return v; } }
  function expr() { let v = term(); for (;;) { const c = peek(); if (c === '+') { i++; v += term(); } else if (c === '-') { i++; v -= term(); } else return v; } }
  const v = expr(); ws(); if (i < s.length) fail('unexpected ' + s[i]);
  return v;
}
