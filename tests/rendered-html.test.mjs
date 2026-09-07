import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Digital Photobooth landing screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>C&amp;T&#x27;s Digital Photobooth<\/title>/i);
  assert.match(html, /Lookin.*good! Snap a pic or two with us~/);
  assert.match(html, /Choose a fun frame/);
  assert.match(html, /Open Camera/);
  assert.match(html, /Your photo stays on this device/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps the MVP local and includes the replaceable frame", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(page, /canvas\.toBlob/);
  assert.match(page, /wedding-frame-1\.png/);
  assert.match(page, /wedding-frame-2\.png/);
  assert.match(page, /wedding-frame-3\.png/);
  assert.match(page, /Change Frame/);
  assert.doesNotMatch(page, /fetch\(|XMLHttpRequest|localStorage|indexedDB/);
  await Promise.all([
    access(new URL("../public/wedding-frame-1.png", import.meta.url)),
    access(new URL("../public/wedding-frame-2.png", import.meta.url)),
    access(new URL("../public/wedding-frame-3.png", import.meta.url)),
  ]);
});
