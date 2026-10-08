/**
 * The production page reader (nodeTransport + systemResolver), exercised for real against a local
 * HTTPS server on 127.0.0.1 with a throwaway self-signed certificate generated for the test. No
 * internet: the server is in this process, the certificate exists only in a temp directory, and the
 * public address the resolver "returns" is replaced by the loopback address only inside the test's
 * transport wrapper — after safeFetch has validated it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import https from "node:https";
import zlib from "node:zlib";
import type { AddressInfo } from "node:net";
import { nodeTransport, safeFetch, sniffImage, systemResolver, type Transport } from "@/server/integrations/recipe-import/fetcher";
import { extractRecipes } from "@/server/integrations/recipe-import/jsonld";

const HOST = "recipes.tls-test.example.com";
let dir: string;
let ca: Buffer;
let server: https.Server;
let port: number;
let lastHost: string | undefined;

const PAGE = `<!doctype html><html><head><script type="application/ld+json">{"@type":"Recipe","name":"TLS Test Soup","recipeIngredient":["1 cup lentils","2 cups water"],"recipeYield":"2"}</script></head><body>synthetic</body></html>`;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "table-tls-"));
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", `/CN=${HOST}`,
    "-addext", `subjectAltName=DNS:${HOST}`, "-keyout", path.join(dir, "key.pem"), "-out", path.join(dir, "cert.pem"),
  ], { stdio: "ignore" });
  ca = readFileSync(path.join(dir, "cert.pem"));
  server = https.createServer({ key: readFileSync(path.join(dir, "key.pem")), cert: ca }, (req, res) => {
    lastHost = req.headers.host;
    if (req.url === "/soup") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-encoding": "gzip", "set-cookie": "tracker=1" });
      res.end(zlib.gzipSync(PAGE));
    } else if (req.url === "/big") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("x".repeat(64 * 1024));
    } else if (req.url === "/photo.png") {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(PNG);
    } else if (req.url === "/moved") {
      res.writeHead(302, { location: "https://10.0.0.1/inside" });
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  rmSync(dir, { recursive: true, force: true });
});

/** The real transport, pointed at the local server only after safeFetch validated the (fake) public address. */
const local = (inner: Transport): Transport => (req) => inner({ ...req, ip: "127.0.0.1", port });
const publicResolver = async () => ["93.184.215.14"];

describe("live transport against a local TLS server", () => {
  it("LT-01: verifies the certificate for the host name, sends SNI/Host, drops cookies, and safeFetch decodes the gzip page", async () => {
    const out = await safeFetch(`https://${HOST}/soup`, { resolve: publicResolver, transport: local(nodeTransport({ ca })) });
    expect(out.kind).toBe("ok");
    if (out.kind !== "ok") return;
    expect(lastHost).toBe(`${HOST}:${port}`); // the port appears only because the test server is not on 443
    expect(extractRecipes(out.text).candidates[0]).toMatchObject({ name: "TLS Test Soup", ingredients: ["1 cup lentils", "2 cups water"], servings: 2 });
    const raw = await nodeTransport({ ca })({ ip: "127.0.0.1", port, hostname: HOST, path: "/soup", headers: {}, signal: new AbortController().signal });
    expect(raw.headers["set-cookie"]).toBeUndefined();
    for await (const _ of raw.body) void _; // drain
  });

  it("LT-02: refuses a certificate that isn't for the host, and one not signed by a trusted root (the system roots, as in production)", async () => {
    const wrong = await safeFetch("https://other.tls-test.example.com/soup", { resolve: publicResolver, transport: local(nodeTransport({ ca })) });
    expect(wrong).toMatchObject({ kind: "failed", code: "connect_failed" });
    const untrusted = await safeFetch(`https://${HOST}/soup`, { resolve: publicResolver, transport: local(nodeTransport()) });
    expect(untrusted).toMatchObject({ kind: "failed", code: "connect_failed" });
  });

  it("LT-03: size cap, HTTP status, refused redirect target and photo mode all hold on the real transport", async () => {
    const t = local(nodeTransport({ ca }));
    expect(await safeFetch(`https://${HOST}/big`, { resolve: publicResolver, transport: t }, { maxBytes: 1024, maxCompressedBytes: 1024 })).toMatchObject({ kind: "failed", code: "too_large" });
    expect(await safeFetch(`https://${HOST}/nothing`, { resolve: publicResolver, transport: t })).toMatchObject({ kind: "failed", code: "http_status", status: 404 });
    expect(await safeFetch(`https://${HOST}/moved`, { resolve: publicResolver, transport: t })).toMatchObject({ kind: "refused", code: "redirect_refused" });
    const photo = await safeFetch(`https://${HOST}/photo.png`, { resolve: publicResolver, transport: t }, {}, { accept: "image" });
    expect(photo.kind).toBe("ok");
    if (photo.kind === "ok") expect(sniffImage(photo.bytes!)).toBe("image/png");
    expect(await safeFetch(`https://${HOST}/soup`, { resolve: publicResolver, transport: t }, {}, { accept: "image" })).toMatchObject({ kind: "failed", code: "unsupported_content_type" });
  });

  it("LT-04: the transport refuses to resolve names itself (needs a pinned address); the system resolver answers from the OS (localhost, no network)", async () => {
    await expect(nodeTransport({ ca })({ ip: HOST, port, hostname: HOST, path: "/soup", headers: {}, signal: new AbortController().signal })).rejects.toThrow(/pinned address/);
    const answers = await systemResolver()("localhost");
    expect(answers.some((a) => a === "127.0.0.1" || a === "::1")).toBe(true);
    // ...and safeFetch refuses those answers before any connection.
    expect(await safeFetch("https://localhost.tls-test.example.com/x", { resolve: async () => answers, transport: local(nodeTransport({ ca })) })).toMatchObject({ kind: "refused", code: "private_address" });
  });
});

describe("photo sniffing", () => {
  it("knows JPEG, PNG, GIF and WebP by their bytes, and nothing else", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(Buffer.from("GIF89a...."))).toBe("image/gif");
    expect(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffImage(Buffer.from("<html>"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});
