import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cleanup, read, runScript, tempDir } from "./helpers.mjs";

const qr = (t, args) => {
  const dir = tempDir("ariane-qr-");
  t.after(() => cleanup(dir));
  return { dir, ...runScript("qr-code.mjs", args, { cwd: dir }) };
};

test("sans adresse : usage et code 2", (t) => {
  const r = qr(t, []);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Usage/);
});

test("adresse invalide ou autre que http(s) : refusée", (t) => {
  assert.equal(qr(t, ["pas une adresse"]).code, 1);
  const ftp = qr(t, ["ftp://example.com"]);
  assert.equal(ftp.code, 1);
  assert.match(ftp.stderr, /http et https/);
  assert.equal(qr(t, ["javascript:alert(1)"]).code, 1);
});

test("écrit par défaut .ariane/qr/qr.html, page autonome avec le lien", (t) => {
  const r = qr(t, ["https://mon-app.vercel.app/accueil"]);
  assert.equal(r.code, 0, r.stderr);
  const html = read(r.dir, ".ariane/qr/qr.html");
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes('href="https://mon-app.vercel.app/accueil"'));
  assert.ok(html.includes("Teste ton application sur ton téléphone"));
  assert.ok(!/<script|https?:\/\/[^"' ]*(cdn|googleapis)/i.test(html), "aucune ressource externe");
  assert.match(r.stdout, /Adresse : https:\/\/mon-app\.vercel\.app\/accueil/);
});

test("--out et --title sont respectés, le titre et le lien sont protégés contre le HTML", (t) => {
  const dir = tempDir("ariane-qr-");
  t.after(() => cleanup(dir));
  const out = join(dir, "sous", "dossier", "page.html");
  const r = runScript("qr-code.mjs", ["https://exemple.fr/?a=1&b=<2>", "--title", '<img src=x onerror="boom">', "--out", out], { cwd: dir });
  assert.equal(r.code, 0, r.stderr);
  assert.ok(existsSync(out));
  const html = read(dir, "sous/dossier/page.html");
  assert.ok(html.includes("&lt;img src=x onerror=&quot;boom&quot;&gt;"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<2>"));
});

test("le titre n'est pas pris pour l'adresse", (t) => {
  const r = qr(t, ["--title", "Mon titre", "https://example.com"]);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(read(r.dir, ".ariane/qr/qr.html").includes("Mon titre"));
});

test("--ascii dessine aussi le code dans le terminal", (t) => {
  const r = qr(t, ["https://example.com", "--ascii"]);
  assert.match(r.stdout, /[█▀▄]/);
  assert.ok(r.stdout.split("\n").length > 15);
  assert.ok(!qr(t, ["https://example.com"]).stdout.match(/[█▀▄]/));
});

test("le même lien donne toujours le même dessin", (t) => {
  const a = qr(t, ["https://example.com"]);
  const b = qr(t, ["https://example.com"]);
  assert.equal(read(a.dir, ".ariane/qr/qr.html"), read(b.dir, ".ariane/qr/qr.html"));
  const c = qr(t, ["https://example.org"]);
  assert.notEqual(read(a.dir, ".ariane/qr/qr.html").match(/<path d="([^"]+)"/)[1], read(c.dir, ".ariane/qr/qr.html").match(/<path d="([^"]+)"/)[1]);
});
