import { classifyLine } from "./repo/packages/recipe-extraction/bench/outcomes";
const base: any = { id: "x", split: "dev", categories: ["integer_decimal"], input: "salt", accept: {}, severity: "high", seasoningClass: null, provenance: { kind: "synthetic_pattern", source: "x" },
  expect: { status: "needs_review", name: "salt", quantity: null, unit: null, packageSize: null, equivalents: [], form: null, note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null } };
const reading: any = { raw: "salt", normalized: "salt", status: "bogus", name: "salt", quantity: { kind: "exact", numerator: "1", denominator: "1", display: "1" }, unit: { canonical: "cup", dimension: "volume", source: "cup" }, packageSize: null, equivalents: [], form: null, note: null, alternatives: [], optional: false, approximate: false, amountUnstated: null, reasons: [], evidence: { spans: {} } };
const o = classifyLine(base, reading);
console.log("invalid status →", o.outcome, "severe", o.severe);
// a ready reading that violates the validator (ready with a range) is not CE
const r2 = { ...reading, status: "ready", quantity: { kind: "range", min: { kind: "exact", numerator: "1", denominator: "1", display: "1" }, max: { kind: "exact", numerator: "2", denominator: "1", display: "2" }, display: "1-2" } };
const c2 = { ...base, expect: { ...base.expect, status: "needs_review", quantity: "1..2", unit: "cup" } };
const o2 = classifyLine(c2, r2);
console.log("contract-invalid ready range →", o2.outcome, o2.falseCertainty, o2.severe);
