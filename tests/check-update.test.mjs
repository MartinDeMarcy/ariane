import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { cleanup, readJson, runScriptAsync, tempDir, write } from "./helpers.mjs";

// Un petit serveur local qui joue le rôle de GitHub (jamais de vrai réseau).
const manifestServer = async (t, { version = "0.27.0", status = 200, body } = {}) => {
  const hits = { count: 0 };
  const server = createServer((req, res) => {
    hits.count++;
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(body ?? JSON.stringify({ name: "ariane", version }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { url: `http://127.0.0.1:${server.address().port}/plugin.json`, hits };
};

const run = (t, { url, current = "0.26.0", home, args = [] }) => {
  const dir = home || tempDir("ariane-home-");
  if (!home) t.after(() => cleanup(dir));
  return runScriptAsync("check-update.mjs", args, { env: { ARIANE_HOME: dir, ARIANE_CURRENT_VERSION: current, ARIANE_MANIFEST_URL: url } }).then((r) => ({ ...r, home: dir }));
};

test("une version plus récente est annoncée une fois, puis plus pendant un jour", async (t) => {
  const { url, hits } = await manifestServer(t);
  const first = await run(t, { url });
  assert.equal(first.code, 0);
  assert.deepEqual(first.json, { current: "0.26.0", latest: "0.27.0", updateAvailable: true, notify: true });
  const second = await run(t, { url, home: first.home });
  assert.deepEqual(second.json, { current: "0.26.0", latest: "0.27.0", updateAvailable: true, notify: false });
  assert.equal(hits.count, 1, "au plus une vérification réseau par jour");
});

test("--force revérifie et annonce de nouveau", async (t) => {
  const { url, hits } = await manifestServer(t);
  const first = await run(t, { url });
  const forced = await run(t, { url, home: first.home, args: ["--force"] });
  assert.equal(forced.json.notify, true);
  assert.equal(hits.count, 2);
});

test("à jour ou en avance : rien à annoncer", async (t) => {
  const { url } = await manifestServer(t, { version: "0.26.0" });
  const same = await run(t, { url, current: "0.26.0" });
  assert.deepEqual(same.json, { current: "0.26.0", latest: "0.26.0", updateAvailable: false, notify: false });
  const ahead = await run(t, { url, current: "0.30.0" });
  assert.equal(ahead.json.updateAvailable, false);
});

test("les versions se comparent comme des nombres : 0.10.0 est plus récente que 0.9.0", async (t) => {
  const { url } = await manifestServer(t, { version: "0.10.0" });
  assert.equal((await run(t, { url, current: "0.9.0" })).json.updateAvailable, true);
  const { url: older } = await manifestServer(t, { version: "0.9.0" });
  assert.equal((await run(t, { url: older, current: "0.10.0" })).json.updateAvailable, false);
  const { url: major } = await manifestServer(t, { version: "1.0.0" });
  assert.equal((await run(t, { url: major, current: "0.99.99" })).json.updateAvailable, true);
});

test("hors ligne : silence total, sans erreur", async (t) => {
  const r = await run(t, { url: "http://127.0.0.1:1/plugin.json" });
  assert.equal(r.code, 0);
  assert.equal(r.stderr, "");
  assert.deepEqual(r.json, { current: "0.26.0", latest: null, updateAvailable: false, notify: false });
});

test("GitHub répond une erreur ou une réponse inattendue : on ignore, sans bruit", async (t) => {
  const down = await manifestServer(t, { status: 503, body: "oups" });
  assert.equal((await run(t, { url: down.url })).json.latest, null);
  const odd = await manifestServer(t, { body: JSON.stringify({ version: 27 }) });
  assert.equal((await run(t, { url: odd.url })).json.latest, null);
  const junk = await manifestServer(t, { body: "pas du json" });
  const r = await run(t, { url: junk.url });
  assert.equal(r.code, 0);
  assert.equal(r.json.latest, null);
});

test("un cache de plus d'un jour est revérifié", async (t) => {
  const { url, hits } = await manifestServer(t, { version: "0.30.0" });
  const home = tempDir("ariane-home-");
  t.after(() => cleanup(home));
  write(home, { "update-check.json": { latest: "0.1.0", checkedAt: 0, notifiedAt: 0 } });
  const r = await run(t, { url, home });
  assert.equal(r.json.latest, "0.30.0");
  assert.equal(hits.count, 1);
  assert.equal(readJson(home, "update-check.json").latest, "0.30.0");
});

test("un cache du jour sert sans réseau, même hors ligne", async (t) => {
  const home = tempDir("ariane-home-");
  t.after(() => cleanup(home));
  write(home, { "update-check.json": { latest: "0.28.0", checkedAt: Date.now(), notifiedAt: 0 } });
  const r = await run(t, { url: "http://127.0.0.1:1/plugin.json", home });
  assert.deepEqual(r.json, { current: "0.26.0", latest: "0.28.0", updateAvailable: true, notify: true });
});

test("un cache illisible est ignoré", async (t) => {
  const { url } = await manifestServer(t);
  const home = tempDir("ariane-home-");
  t.after(() => cleanup(home));
  write(home, { "update-check.json": "{ cassé" });
  assert.equal((await run(t, { url, home })).json.latest, "0.27.0");
});

test("sans ARIANE_CURRENT_VERSION, lit la version du plugin lui-même", async (t) => {
  const { url } = await manifestServer(t, { version: "999.0.0" });
  const home = tempDir("ariane-home-");
  t.after(() => cleanup(home));
  const r = await runScriptAsync("check-update.mjs", [], { env: { ARIANE_HOME: home, ARIANE_MANIFEST_URL: url, ARIANE_CURRENT_VERSION: "" } });
  const plugin = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "plugins", "ariane", ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(r.json.current, plugin.version);
  assert.equal(r.json.updateAvailable, true);
});
