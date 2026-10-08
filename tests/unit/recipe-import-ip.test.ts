/**
 * Address classification: only globally routable unicast is public; embedded IPv4 is classified
 * by the IPv4 address; anything unparseable is not public.
 */
import { describe, expect, it } from "vitest";
import { isPublicAddress, parseIPv6 } from "@/server/integrations/recipe-import/ip";

describe("isPublicAddress IPv4", () => {
  it.each([
    "0.0.0.0", "0.1.2.3", "10.0.0.1", "10.255.255.255", "100.64.0.1", "100.127.255.255", "127.0.0.1", "127.255.255.254",
    "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.0.0.1", "192.0.2.10", "192.88.99.1", "192.168.1.1",
    "198.18.0.1", "198.19.255.255", "198.51.100.7", "203.0.113.9", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
  ])("%s is not public", (ip) => expect(isPublicAddress(ip)).toBe(false));

  it.each(["1.1.1.1", "8.8.8.8", "93.184.215.14", "100.63.255.255", "100.128.0.0", "172.15.255.255", "172.32.0.0", "192.0.1.1", "192.169.0.1", "198.17.255.255", "198.20.0.0", "223.255.255.255"])(
    "%s is public",
    (ip) => expect(isPublicAddress(ip)).toBe(true),
  );

  it.each(["", "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "0x7f.0.0.1", "2130706433", "1.2.3.4 ", " 1.2.3.4", "1.2.3.-4", "a.b.c.d"])(
    "unparseable %j is not public",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );
});

describe("isPublicAddress IPv6", () => {
  it.each([
    "::", "::1", "0:0:0:0:0:0:0:1", "fc00::1", "fd12:3456::1", "fe80::1", "febf::1", "fec0::1", "ff02::1", "ff0e::1",
    "2001:db8::1", "2001:0db8:85a3::8a2e:370:7334", "100::1", "100::ffff:ffff:ffff:ffff", "2001::1", "2001:0:4136:e378:8000:63bf:3fff:fdd2",
    "2001:1ff::1", "3fff::1", "64:ff9b:1::1", "1::1", "4000::1",
    // embedded IPv4 that is not public
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:169.254.169.254", "::127.0.0.1", "::10.1.2.3",
    "64:ff9b::127.0.0.1", "64:ff9b::a00:1", "64:ff9b::192.168.0.1", "2002:7f00:1::", "2002:c0a8:101::1", "2002:a9fe:a9fe::1",
  ])("%s is not public", (ip) => expect(isPublicAddress(ip)).toBe(false));

  it.each([
    "2606:4700:4700::1111", "2a00:1450:4001::200e", "2001:4860:4860::8888", "2001:200::1", "2400::1",
    "::ffff:8.8.8.8", "::ffff:0808:0808", "64:ff9b::8.8.8.8", "2002:0808:0808::1", "::8.8.8.8",
  ])("%s is public", (ip) => expect(isPublicAddress(ip)).toBe(true));

  it.each([
    "fe80::1%eth0", "::1%lo", "[::1]", "1:2:3:4:5:6:7:8:9", "1::2::3", "12345::1", "g::1", ":1:2:3:4:5:6:7", "1:2:3:4:5:6:7:",
    "1:2:3:4:5:6:7", "::ffff:256.0.0.1", "::ffff:1.2.3", "1.2.3.4::", ":::", "::ffff:8.8.8.8:1",
  ])("unparseable %j is not public", (ip) => expect(isPublicAddress(ip)).toBe(false));

  it("parses compression and embedded quads exactly", () => {
    expect(parseIPv6("::")).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(parseIPv6("1::")).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(parseIPv6("::ffff:1.2.3.4")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
    expect(parseIPv6("1:2:3:4:5:6:7:8")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parseIPv6("1:2:3:4:5:6:7::")).toEqual([1, 2, 3, 4, 5, 6, 7, 0]);
    expect(parseIPv6("1:2:3:4:5:6:1.2.3.4")).toEqual([1, 2, 3, 4, 5, 6, 0x0102, 0x0304]);
  });

  it("refuses non-strings", () => {
    expect(isPublicAddress(undefined as unknown as string)).toBe(false);
    expect(isPublicAddress(null as unknown as string)).toBe(false);
  });
});
