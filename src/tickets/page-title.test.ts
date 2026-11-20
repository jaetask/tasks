import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { publicAddress, publicName, readTitle, titleOf } from "./page-title.js";

test("only public addresses may be reached", () => {
  for (const closed of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:7f00:1",
    "not an address",
  ]) {
    assert.equal(publicAddress(closed), false, closed);
  }
  for (const open of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700::1111"]) {
    assert.equal(publicAddress(open), true, open);
  }
});

test("local and bare names are not asked", () => {
  for (const closed of [
    "localhost",
    "LOCALHOST.",
    "mac.local",
    "api.localhost",
    "router.lan",
    "db.internal",
    "intranet",
    "127.0.0.1",
    "[::1]",
    "192.168.0.10",
    "",
  ]) {
    assert.equal(publicName(closed), false, closed);
  }
  for (const open of ["example.com", "www.youtube.com", "8.8.8.8"]) {
    assert.equal(publicName(open), true, open);
  }
});

test("a page's title and description are read as plain text", () => {
  assert.deepEqual(
    titleOf(
      `<html><head><title> Fix the  crash &amp; ship <b>it</b></title>
       <meta property="og:description" content="Two lines&#10;of &lt;script&gt;text&lt;/script&gt;"></head></html>`,
    ),
    { title: "Fix the crash & ship it", description: "Two lines of <script>text</script>" },
  );
  assert.deepEqual(
    titleOf(`<meta content='Pull request 7' property='og:title'><title>Other</title>`),
    { title: "Pull request 7", description: "" },
  );
  assert.deepEqual(titleOf("<p>no title here</p>"), { title: "", description: "" });
  assert.equal(titleOf(`<title>${"a".repeat(500)}</title>`).title.length, 200);
});

test("addresses that are not public web addresses are refused without a request", async () => {
  for (const url of [
    "http://localhost:8091/health",
    "http://127.0.0.1:8091/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data",
    "http://mac.local/",
    "http://user:secret@example.com/",
    "file:///etc/passwd",
    "ftp://example.com/",
    "not a url",
  ]) {
    assert.equal(await readTitle(url), null, url);
  }
});

test("a server on this machine is not read, whatever name reaches it", async () => {
  let asked = 0;
  const server = createServer((_, response) => {
    asked += 1;
    response.setHeader("content-type", "text/html");
    response.end("<title>Private</title>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    // localtest.me and nip.io names resolve to 127.0.0.1: the lookup guard must refuse them.
    assert.equal(await readTitle(`http://127.0.0.1.nip.io:${port}/`), null);
    assert.equal(await readTitle(`http://localtest.me:${port}/`), null);
    assert.equal(asked, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
