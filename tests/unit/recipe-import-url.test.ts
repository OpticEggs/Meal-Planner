/**
 * Recipe link validation: normalization, dedup keys and refusals. Pure; no network.
 */
import { describe, expect, it } from "vitest";
import { checkImportUrl, isBudgetBytes, validateLinkUrl, type LinkCheck } from "@/server/integrations/recipe-import/url";

const ok = (r: LinkCheck) => {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${r.message}`);
  return r;
};
const code = (raw: string) => {
  const r = validateLinkUrl(raw);
  return r.ok ? "ok" : r.code;
};

describe("validateLinkUrl normalization", () => {
  it("cleans the stored URL: trims, lowercases scheme and host, drops default port, fragment and tracking", () => {
    const r = ok(validateLinkUrl("  HTTPS://WWW.Example.COM:443/Recipes/Soup/?utm_source=x&b=2&fbclid=abc&a=1#jump-to-recipe \n"));
    expect(r.url).toBe("https://www.example.com/Recipes/Soup/?b=2&a=1");
    expect(r.key).toBe("example.com/Recipes/Soup?a=1&b=2");
    expect(r.domain).toBe("example.com");
    expect(r.sourceLabel).toBe("example.com");
  });

  it("dedupes tracking, scheme, www, trailing-slash, fragment and param-order variants of one page", () => {
    const variants = [
      "https://www.example.com/chili/?a=1&b=2",
      "http://example.com/chili?b=2&a=1",
      "https://example.com/chili/?a=1&utm_medium=social&b=2&utm_campaign=z",
      "https://EXAMPLE.com/chili/#comments?a=9",
      "https://example.com/chili?gclid=1&dclid=2&msclkid=3&mc_cid=4&mc_eid=5&igshid=6&_ga=7&_gl=8&yclid=9&ref=10&ref_src=11&ck_subscriber_id=12&epik=13&si=14&UTM_SOURCE=15&a=1&b=2",
      "https://example.com:443/chili/?a=1&b=2",
      "http://example.com:80/chili/?a=1&b=2",
      "https://example.com./chili?a=1&b=2",
    ];
    const keys = new Set(variants.map((v) => ok(validateLinkUrl(v)).key));
    // the fragment variant has no query: a different page key
    expect(keys).toEqual(new Set(["example.com/chili?a=1&b=2", "example.com/chili"]));
    expect(ok(validateLinkUrl(variants[3])).key).toBe("example.com/chili");
  });

  it("keeps different pages apart", () => {
    const keys = [
      "https://example.com/chili",
      "https://example.com/Chili",
      "https://example.com/chili?id=2",
      "https://example.com/chili?id=3",
      "https://sub.example.com/chili",
      "https://example.com:8443/chili",
      "https://example.org/chili",
      "https://example.com/chili/verde",
    ].map((v) => ok(validateLinkUrl(v)).key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("root path keeps its slash and an emptied query disappears", () => {
    const r = ok(validateLinkUrl("https://www.example.com/?utm_source=a"));
    expect(r.url).toBe("https://www.example.com/");
    expect(r.key).toBe("example.com/");
  });

  it("preserves the encoding of kept params in the stored URL; the key re-encodes them consistently", () => {
    const a = ok(validateLinkUrl("https://example.com/s?q=black%20beans&utm_term=x"));
    const b = ok(validateLinkUrl("https://example.com/s?q=black+beans"));
    expect(a.url).toBe("https://example.com/s?q=black%20beans");
    expect(a.key).toBe(b.key);
  });

  it("labels known sources", () => {
    const r = ok(validateLinkUrl("https://www.budgetbytes.com/some-synthetic-path/"));
    expect(r.domain).toBe("budgetbytes.com");
    expect(r.sourceLabel).toBe("Budget Bytes");
    expect(isBudgetBytes("budgetbytes.com")).toBe(true);
    expect(isBudgetBytes("www.BudgetBytes.com")).toBe(true);
    expect(isBudgetBytes("notbudgetbytes.com")).toBe(false);
    expect(isBudgetBytes("budgetbytes.com.evil.example")).toBe(false);
  });

  it("accepts an IDN host in its punycode form", () => {
    const r = ok(validateLinkUrl("https://bücher.example.com/rezept"));
    expect(r.domain).toBe("xn--bcher-kva.example.com");
    expect(r.url).toBe("https://xn--bcher-kva.example.com/rezept");
  });
});

describe("validateLinkUrl refusals", () => {
  it.each([
    ["", "invalid_url"],
    ["   ", "invalid_url"],
    ["example.com/recipe", "invalid_url"],
    ["not a url", "invalid_url"],
    ["javascript:alert(1)", "unsupported_scheme"],
    ["JaVaScRiPt:alert(1)", "unsupported_scheme"],
    ["data:text/html,<script>alert(1)</script>", "unsupported_scheme"],
    ["file:///etc/passwd", "unsupported_scheme"],
    ["ftp://example.com/x", "unsupported_scheme"],
    ["blob:https://example.com/uuid", "unsupported_scheme"],
    ["ws://example.com/", "unsupported_scheme"],
    ["http://user:pass@example.com/", "credentials_in_url"],
    ["https://user@example.com/", "credentials_in_url"],
    ["https://:pw@example.com/", "credentials_in_url"],
    ["http://localhost/", "invalid_host"],
    ["http://localhost:3000/admin", "invalid_host"],
    ["http://intranet/", "invalid_host"],
    ["http://printer.local/", "invalid_host"],
    ["http://app.localhost/", "invalid_host"],
    ["http://db.internal/", "invalid_host"],
    ["http://router.home.arpa/", "invalid_host"],
    ["http://1.0.0.127.in-addr.arpa/", "invalid_host"],
    ["http://nas.lan/", "invalid_host"],
    ["http://127.0.0.1/", "invalid_host"],
    ["http://2130706433/", "invalid_host"],
    ["http://0x7f.1/", "invalid_host"],
    ["http://0177.0.0.1/", "invalid_host"],
    ["http://8.8.8.8/", "invalid_host"],
    ["http://[::1]/", "invalid_host"],
    ["http://[::ffff:127.0.0.1]/", "invalid_host"],
    ["http://[2606:4700::1111]/", "invalid_host"],
    ["http://exa_mple.com/", "invalid_host"],
    ["http://-bad.example.com/", "invalid_host"],
    ["http://example.123/", "invalid_url"],
    ["https://a..example.com/", "invalid_host"],
  ])("%s → %s", (raw, expected) => {
    expect(code(raw)).toBe(expected);
  });

  it("refuses over-long links before and after cleaning", () => {
    expect(code(`https://example.com/${"a".repeat(2100)}`)).toBe("too_long");
    expect(code(`https://example.com/${"a".repeat(2000)}`)).toBe("ok");
  });

  it("never throws on hostile input", () => {
    for (const raw of ["http://", "https://%", "http://[", "http://a b.com", "\u0000http://x.com", "https://exa\u0000mple.com", "java\nscript:alert(1)", "https://example.com/a\tb", 42 as unknown as string]) {
      expect(() => validateLinkUrl(raw)).not.toThrow();
      expect(validateLinkUrl(raw).ok).toBe(false);
    }
  });
});

describe("checkImportUrl", () => {
  it("requires https on the default port", () => {
    expect(checkImportUrl("https://example.com/r").ok).toBe(true);
    expect(checkImportUrl("https://example.com:443/r").ok).toBe(true);
    const http = checkImportUrl("http://example.com/r");
    expect(http.ok ? "ok" : http.code).toBe("import_requires_https");
    const port = checkImportUrl("https://example.com:8443/r");
    expect(port.ok ? "ok" : port.code).toBe("nonstandard_port");
    const local = checkImportUrl("https://localhost/r");
    expect(local.ok ? "ok" : local.code).toBe("invalid_host");
    const creds = checkImportUrl("https://u:p@example.com/r");
    expect(creds.ok ? "ok" : creds.code).toBe("credentials_in_url");
  });
});
