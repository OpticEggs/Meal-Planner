// Upgrade rehearsal: compare two projection snapshots (before / after). Every line must keep its amount, package
// counts, what is still to send and status. A line's review identity (fingerprint) and the validity of the approval
// bound to it may change ONLY where an exact recipe row is behind the line (EQR: the exact requirement joined the
// identity; all-legacy lines keep theirs) — those lines are listed so the transition is explicit.
const fs = await import("node:fs");
const [beforeFile, afterFile] = process.argv.slice(2);
const before: any[] = JSON.parse(fs.readFileSync(beforeFile, "utf8"));
const after: any[] = JSON.parse(fs.readFileSync(afterFile, "utf8"));
const problems: string[] = [];
const changedIdentity: string[] = [];
if (before.length !== after.length) problems.push(`line count ${before.length} → ${after.length}`);
for (const b of before) {
  const a = after.find((x) => x.week === b.week && x.key === b.key);
  if (!a) { problems.push(`${b.key}: missing after`); continue; }
  for (const f of ["meal", "unit", "packagesForMeal", "packagesNeeded", "toSend", "sent"]) if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) problems.push(`${b.key}.${f}: ${JSON.stringify(b[f])} → ${JSON.stringify(a[f])}`);
  if (a.fingerprint !== b.fingerprint || a.approvalValid !== b.approvalValid || a.status !== b.status) {
    if (a.anyExact) changedIdentity.push(`${b.key} (approval ${b.approvalValid} → ${a.approvalValid}, status ${b.status} → ${a.status})`);
    else problems.push(`${b.key}: identity changed on an all-legacy line (${b.fingerprint.slice(0, 8)} → ${a.fingerprint.slice(0, 8)}, approval ${b.approvalValid} → ${a.approvalValid})`);
  }
}
console.log(JSON.stringify({ ok: problems.length === 0, problems, changedIdentity }, null, 1));
process.exit(problems.length ? 1 : 0);
