// Terminal UI helpers — ANSI truecolor (atelier lime/ink palette), no deps.
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const LIME = "\x1b[38;2;198;242;74m";
const MINT = "\x1b[38;2;116;232;180m";
const DIM = "\x1b[38;2;150;160;152m";
const FAINT = "\x1b[38;2;110;120;114m";
const AMBER = "\x1b[38;2;244;201;93m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export const c = {
  lime: (s) => `${LIME}${s}${RESET}`,
  mint: (s) => `${MINT}${s}${RESET}`,
  dim: (s) => `${DIM}${s}${RESET}`,
  faint: (s) => `${FAINT}${s}${RESET}`,
  amber: (s) => `${AMBER}${s}${RESET}`,
  bold: (s) => `${BOLD}${s}${RESET}`,
};

export function line(s = "") {
  stdout.write(s + "\n");
}

export function rule(label = "") {
  const w = 56;
  const dash = "─".repeat(Math.max(0, w - label.length - 2));
  line(c.faint(`${"─".repeat(2)} ${label} ${dash}`));
}

export function banner(title, subtitle) {
  line("");
  line(`  ${c.lime("❯")} ${c.bold(title)}`);
  if (subtitle) line(`    ${c.faint(subtitle)}`);
  line("");
}

// A queue-backed line reader. A single 'line' listener buffers every line, so
// nothing is dropped between prompts — robust for both interactive TTY and
// piped stdin (which delivers all lines at once).
let _rl = null;
let _queue = [];
let _waiter = null;
let _ended = false;

function ensure() {
  if (_rl) return;
  _rl = readline.createInterface({ input: stdin, output: stdout });
  _rl.on("line", (l) => {
    if (_waiter) {
      const w = _waiter;
      _waiter = null;
      w(l);
    } else _queue.push(l);
  });
  _rl.on("close", () => {
    _ended = true;
    if (_waiter) {
      const w = _waiter;
      _waiter = null;
      w(null);
    }
  });
}

function nextLine() {
  ensure();
  if (_queue.length) return Promise.resolve(_queue.shift());
  if (_ended) return Promise.resolve(null);
  return new Promise((res) => {
    _waiter = res;
  });
}

export function closeUI() {
  if (_rl) {
    _rl.close();
    _rl = null;
  }
}

/** Ask one question, return the trimmed answer. */
export async function prompt(question) {
  ensure();
  stdout.write(`${c.lime("›")} ${question}\n  `);
  const l = await nextLine();
  return (l ?? "").trim();
}

/** Single-choice menu. options: [{key,label}]. Returns chosen key. */
export async function choose(question, options) {
  line(`${c.lime("›")} ${question}`);
  options.forEach((o, i) => line(`  ${c.mint(String(i + 1))}. ${o.label}`));
  const a = await prompt("Pick a number:");
  const idx = parseInt(a, 10) - 1;
  return options[idx]?.key ?? options[0].key;
}

export function spinnerStart(text) {
  if (!stdout.isTTY) {
    line(c.faint(`… ${text}`));
    return () => {};
  }
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const t = setInterval(() => {
    stdout.write(`\r${c.lime(frames[i++ % frames.length])} ${c.faint(text)}   `);
  }, 80);
  return () => {
    clearInterval(t);
    stdout.write("\r" + " ".repeat(text.length + 8) + "\r");
  };
}
