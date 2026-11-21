import { lookup as dnsLookup } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

export type PageTitle = { title: string; description: string };
export type ReadTitle = (url: string) => Promise<PageTitle | null>;

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

const closed = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  closed.addSubnet(net, bits, "ipv4");
}
for (const [net, bits] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
] as const) {
  closed.addSubnet(net, bits, "ipv6");
}

export function publicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  if (family === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
    if (mapped?.[1]) return publicAddress(mapped[1]);
    if (/^::ffff:/i.test(address)) return false;
    return !closed.check(address, "ipv6");
  }
  return !closed.check(address, "ipv4");
}

export function publicName(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, "");
  if (name === "" || name === "localhost") return false;
  if (/\.(local|localhost|internal|lan|home|test)$/.test(name)) return false;
  const bare = name.replace(/^\[|\]$/g, "");
  if (isIP(bare) !== 0) return publicAddress(bare);
  return name.includes(".");
}

const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, found) => {
    if (error) return callback(error, "", 0);
    const addresses = (Array.isArray(found) ? found : []).filter((a) => publicAddress(a.address));
    const first = addresses[0];
    if (!first) {
      return callback(new Error(`${hostname} is not a public address`), "", 0);
    }
    if ((options as { all?: boolean }).all) {
      return (callback as unknown as (e: null, a: typeof addresses) => void)(null, addresses);
    }
    callback(null, first.address, first.family);
  });
};

type Got = { status: number; location: string | undefined; type: string; body: string };

function get(url: URL, accept: string): Promise<Got> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        timeout: TIMEOUT_MS,
        headers: { accept, "user-agent": "tasks-link-title", "accept-encoding": "identity" },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const done = () =>
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
            type: String(response.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks).toString("utf8"),
          });
        response.on("data", (chunk: Buffer) => {
          const room = MAX_BYTES - size;
          if (room <= 0) return;
          chunks.push(chunk.subarray(0, room));
          size += Math.min(chunk.length, room);
          if (size >= MAX_BYTES) {
            done();
            request.destroy();
          }
        });
        response.on("end", done);
        response.on("error", reject);
      },
    );
    const clock = setTimeout(() => request.destroy(new Error("timed out")), TIMEOUT_MS);
    request.on("timeout", () => request.destroy(new Error("timed out")));
    request.on("error", reject);
    request.on("close", () => clearTimeout(clock));
    request.end();
  });
}

function allowed(text: string, base?: URL): URL | null {
  let url: URL;
  try {
    url = new URL(text, base);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return publicName(url.hostname) ? url : null;
}

async function follow(start: URL, accept: string): Promise<Got | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const got = await get(url, accept);
    if (got.status >= 300 && got.status < 400 && got.location) {
      const next = allowed(got.location, url);
      if (!next) return null;
      url = next;
      continue;
    }
    return got.status >= 200 && got.status < 300 ? got : null;
  }
  return null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function plain(html: string, max: number): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
      if (name.startsWith("#")) {
        const code = name[1]?.toLowerCase() === "x" ? parseInt(name.slice(2), 16) : +name.slice(1);
        return Number.isInteger(code) && code > 31 && code < 0x110000
          ? String.fromCodePoint(code)
          : " ";
      }
      return ENTITIES[name.toLowerCase()] ?? whole;
    })
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function meta(html: string, property: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const named = /\b(?:property|name)\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
    if (named?.toLowerCase() !== property) continue;
    const content = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    return content?.[1] ?? content?.[2] ?? "";
  }
  return "";
}

export function titleOf(html: string): PageTitle {
  const head = html.slice(0, MAX_BYTES);
  const title =
    meta(head, "og:title") || (/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? "");
  return { title: plain(title, 200), description: plain(meta(head, "og:description"), 500) };
}

const YOUTUBE = /^(www\.|m\.)?(youtube\.com|youtu\.be)$/;

export const readTitle: ReadTitle = async (text) => {
  try {
    const url = allowed(text);
    if (!url) return null;
    if (YOUTUBE.test(url.hostname)) {
      const ask = new URL("https://www.youtube.com/oembed");
      ask.searchParams.set("url", url.href);
      ask.searchParams.set("format", "json");
      const got = await follow(ask, "application/json");
      if (!got) return null;
      const told = JSON.parse(got.body) as { title?: unknown; author_name?: unknown };
      const title = plain(String(told.title ?? ""), 200);
      return title ? { title, description: plain(String(told.author_name ?? ""), 500) } : null;
    }
    const got = await follow(url, "text/html");
    if (!got || !/^(text\/html|application\/xhtml\+xml)\b/i.test(got.type)) return null;
    const found = titleOf(got.body);
    return found.title ? found : null;
  } catch {
    return null;
  }
};
