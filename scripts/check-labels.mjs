#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "page";
const HOME = "pickers.tsx";
const SHOWN = /LabelDot|LabelName|labelChoice|labelNames/;

function chain(text, from) {
  let i = from;
  for (;;) {
    while (/\s/.test(text[i] ?? "")) i += 1;
    if (text[i] === "?" && text[i + 1] === ".") i += 1;
    if (text[i] !== "." && text[i] !== "[") return i;
    if (text[i] === ".") {
      i += 1;
      while (/[\w$]/.test(text[i] ?? "")) i += 1;
    }
    if (text[i] === "(" || text[i] === "[") {
      const open = text[i];
      const close = open === "(" ? ")" : "]";
      let depth = 0;
      for (; i < text.length; i += 1) {
        if (text[i] === open) depth += 1;
        else if (text[i] === close) {
          depth -= 1;
          if (depth === 0) {
            i += 1;
            break;
          }
        }
      }
    }
  }
}

const found = [];
for (const name of readdirSync(DIR)) {
  if (!/\.tsx?$/.test(name) || name === HOME) continue;
  const text = readFileSync(join(DIR, name), "utf8");
  for (const match of text.matchAll(/\blabels\b(?=\s*\??[.[])/g)) {
    const end = chain(text, match.index + match[0].length);
    const used = text.slice(match.index, end);
    if (!/\.name\b/.test(used) || SHOWN.test(used)) continue;
    found.push(`${join(DIR, name)}:${text.slice(0, match.index).split("\n").length}`);
  }
}

if (found.length) {
  for (const at of found) {
    console.error(
      `${at}  a label is named without its colour. Use labelChoice, LabelName or LabelDot from page/pickers.tsx, so a label always shows its colour.`,
    );
  }
  process.exit(1);
}
console.log("check:labels: every label is shown with its colour.");
