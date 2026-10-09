/**
 * Canonical JSON: object keys sorted by UTF-16 code unit order (the default Array#sort order), array
 * order kept, strings escaped as JSON.stringify does, `undefined` object members omitted. Used for the
 * holdout freeze hash (compact form) and for the deterministic benchmark report (pretty form). Pure.
 */
export function canonicalJson(value: unknown): string {
  return write(value, "$", null, "");
}

/** The same canonical value, indented with two spaces, with a trailing newline. */
export function canonicalJsonPretty(value: unknown): string {
  return write(value, "$", "  ", "") + "\n";
}

function write(value: unknown, where: string, indent: string | null, pad: string): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) throw new TypeError(`${where}: non-finite number is not JSON`);
      return JSON.stringify(value);
    case "object": {
      const inner = indent === null ? "" : pad + indent;
      const open = indent === null ? "" : "\n" + inner;
      const sep = indent === null ? "," : ",\n" + inner;
      const close = indent === null ? "" : "\n" + pad;
      const colon = indent === null ? ":" : ": ";
      if (Array.isArray(value)) {
        if (value.length === 0) return "[]";
        return `[${open}${value.map((v, i) => write(v, `${where}[${i}]`, indent, inner)).join(sep)}${close}]`;
      }
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
      if (keys.length === 0) return "{}";
      return `{${open}${keys.map((k) => `${JSON.stringify(k)}${colon}${write(obj[k], `${where}.${k}`, indent, inner)}`).join(sep)}${close}}`;
    }
    default:
      throw new TypeError(`${where}: ${typeof value} is not JSON`);
  }
}
