/**
 * Address classification for the import fetcher. Our own strict parser: anything we cannot parse
 * (octal or hex IPv4 parts, zone ids, brackets, junk) is not public, so it is never connected to.
 */

/** Strict dotted quad: four decimal octets 0-255, no leading zeros (no octal ambiguity). */
export function parseIPv4(s: string): number | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

/** Eight 16-bit groups, or null. Handles `::` compression and a trailing dotted quad; zone ids refused. */
export function parseIPv6(s: string): number[] | null {
  if (s.length === 0 || s.length > 45 || s.includes("%")) return null;
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const groupsOf = (part: string, isLast: boolean): number[] | null => {
    if (part === "") return [];
    const out: number[] = [];
    const tokens = part.split(":");
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (isLast && i === tokens.length - 1 && t.includes(".")) {
        const v4 = parseIPv4(t);
        if (v4 === null) return null;
        out.push(Math.floor(v4 / 65536), v4 % 65536);
      } else if (/^[0-9a-fA-F]{1,4}$/.test(t)) out.push(parseInt(t, 16));
      else return null;
    }
    return out;
  };
  if (halves.length === 1) {
    const g = groupsOf(halves[0], true);
    return g && g.length === 8 ? g : null;
  }
  const head = groupsOf(halves[0], false);
  const tail = groupsOf(halves[1], true);
  if (!head || !tail || head.length + tail.length > 7) return null;
  return [...head, ...new Array<number>(8 - head.length - tail.length).fill(0), ...tail];
}

// Not public: special-purpose and non-global blocks (IANA IPv4 special-purpose registry).
const V4_BLOCKED = (
  [
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
    ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
    ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4], ["255.255.255.255", 32],
  ] as const
).map(([base, prefix]) => ({ base: parseIPv4(base)!, size: 2 ** (32 - prefix) }));

const v4Public = (n: number) => V4_BLOCKED.every(({ base, size }) => Math.floor(n / size) !== Math.floor(base / size));

const big = (g: number[]) => g.reduce((acc, x) => (acc << 16n) | BigInt(x), 0n);
const inV6 = (v: bigint, base: string, prefix: number) => {
  const shift = BigInt(128 - prefix);
  return v >> shift === big(parseIPv6(base)!) >> shift;
};
const low32 = (v: bigint) => Number(v & 0xffffffffn);

/**
 * True only for a globally routable unicast address. IPv6 must sit in 2000::/3 (global unicast)
 * outside the special blocks; addresses that embed an IPv4 address (mapped, compatible, NAT64,
 * 6to4) are classified by that IPv4 address.
 */
export function isPublicAddress(ip: string): boolean {
  if (typeof ip !== "string") return false;
  const v4 = parseIPv4(ip);
  if (v4 !== null) return v4Public(v4);
  const g = parseIPv6(ip);
  if (!g) return false;
  const v = big(g);
  if (v === 0n || v === 1n) return false; // :: and ::1
  if (inV6(v, "::ffff:0:0", 96)) return v4Public(low32(v)); // IPv4-mapped
  if (inV6(v, "::", 96)) return v4Public(low32(v)); // IPv4-compatible (deprecated)
  if (inV6(v, "64:ff9b::", 96)) return v4Public(low32(v)); // NAT64 well-known prefix
  if (inV6(v, "2002::", 16)) return v4Public(Number((v >> 80n) & 0xffffffffn)); // 6to4
  if (!inV6(v, "2000::", 3)) return false; // covers 64:ff9b:1::/48, 100::/64, fc00::/7, fe80::/10, fec0::/10, ff00::/8
  for (const [base, prefix] of [["2001::", 23], ["2001:db8::", 32], ["3fff::", 20]] as const) {
    if (inV6(v, base, prefix)) return false; // IETF special assignments (incl. Teredo), documentation
  }
  return true;
}
