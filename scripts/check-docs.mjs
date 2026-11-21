#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const UNDECIDED = [
  /open questions?/i,
  /decisions not yet made/i,
  /not yet decided/i,
  /\bTBD\b/i,
  /\bid\s*=\s*["']?(open|openqs)\b/i,
];

const PHRASES = JSON.parse(readFileSync("scripts/docs-phrases.json", "utf8")).map((p) => ({
  ...p,
  re: new RegExp(p.pattern, "i"),
}));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(html|md)$/.test(name) ? [path] : [];
  });
}

const blank = (match) => match.replace(/[^\n]/g, " ");
function prose(text) {
  return text
    .replace(/<pre[\s\S]*?<\/pre>/g, blank)
    .replace(/<code[\s\S]*?<\/code>/g, blank)
    .replace(/```[\s\S]*?```/g, blank)
    .replace(/`[^`\n]*`/g, blank);
}

function heading(line) {
  const md = line.match(/^#+\s+(.*)/);
  if (md) return md[1];
  const html = line.match(/<(h[1-6]|summary)[^>]*>(.*?)<\/\1>/);
  return html ? html[2].replace(/<[^>]+>/g, "") : null;
}

const docs = walk("docs");
const hits = [];
function scan(files, check) {
  for (const file of files) {
    const lines = prose(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      check(`${file}:${i + 1}`, line);
    });
  }
}

scan(["README.md", ...docs], (where, line) => {
  for (const re of UNDECIDED) {
    const m = line.match(re);
    if (m) {
      hits.push(
        `${where}: "${m[0]}": public docs state decisions only; move it to an issue or the conversation`,
      );
    }
  }
});

scan(["README.md", "GLOSSARY.md", "AGENTS.md", ...docs], (where, line) => {
  for (const p of PHRASES) {
    const text = p.headings ? heading(line) : line;
    const m = text?.match(p.re);
    if (m) hits.push(`${where}: "${m[0]}" (${p.why}); instead: ${p.say_instead}`);
  }
});

if (hits.length > 0) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log(`check:docs: ${docs.length + 3} files clean`);
