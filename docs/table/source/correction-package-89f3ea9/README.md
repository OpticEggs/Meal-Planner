# Table — correction package

Reviewed source: `89f3ea9b5e057c5e57928e7978dda3d23ad4d750` in the original `table-89f3ea9.bundle`.

Read `Table-Independent-Review-89f3ea9.md` and `Table-Claude-Correction-Handoff.md`.
Use `Table-Claude-Correction-Prompt.txt` as the coding assignment.

This archive contains review, handoff, diagnostic scripts, and evidence. It does not contain a modified application or a replacement for the original Git bundle. No remote, deployment, or live retailer operation was performed.

The source probes are **counterexample observations**, not a passing contract suite. They execute actual source with recording SQL doubles and no decimal arithmetic. Use the existing real test harness to reproduce and fix the cases.

```bash
# Restore original code where necessary:
git clone --branch main table-89f3ea9.bundle table

# Diagnostic reproduction only (requires TypeScript module for transpilation):
node source-probes.cjs /absolute/path/to/table
# Optional third argument: absolute path to the TypeScript module.

# Scratch-only demonstration of runner failure being classified as mutation kill:
bash mutation-harness-probe.sh /absolute/path/to/table
```

Checksums cover all other files in this archive. Preserve the original acceptance rows and add regression cases; do not replace the product contract with diagnostic assertions that expect a defect.
