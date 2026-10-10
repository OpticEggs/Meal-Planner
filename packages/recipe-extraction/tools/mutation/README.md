# Package mutation runner

`run.ts` checks that the package's tests catch specific faults. For each mutation it copies the package to a
fresh temporary directory, applies **one exact string replacement to one file**, runs the named tests with
vitest's JSON reporter and classifies the run. The same tests are first run once without any mutation; if that
baseline fails, every mutation using those tests is ERROR.

```bash
cd packages/recipe-extraction
npx tsx tools/mutation/run.ts tools/mutation/specs/selftest.json tools/mutation/specs/scorer.json \
  --scratch /path/to/scratch --out-json results.json --out-md results.md      # or: npm run mutation -- …
```

Options: `--only <id,id>`, `--scratch <dir>` (default: the OS temp dir), `--out-json`, `--out-md`, `--keep`
(keep the copies). Exit code 0 when every result equals its spec's `expect`, 1 otherwise, 2 for a usage or
spec error. The copy holds the whole package; the repository's `node_modules`, `src` (Table's app code, for the
parity tests' `@/` alias) and `docs` (evidence some tests read) are symlinked at the copy's root.

## Results

| Class | Meaning |
|---|---|
| **KILLED** | at least one test named in `killedBy` failed with an assertion failure (first line starts with `AssertionError`) that matches its `reason`, when one is given |
| **KILLED-UNEXPECTED** | tests failed, but no `killedBy` test failed that way: only other tests failed, or an expected test failed for another reason (e.g. a `TypeError`) |
| **SURVIVED** | every selected test ran and passed |
| **ERROR** | setup failure, never a kill: the file or anchor is missing, the anchor is ambiguous, a test file failed to compile or load, vitest wrote no report, no test ran, a `killedBy` test is not in the run, or the baseline failed |

## Spec files

Any owner may add a spec file (e.g. `specs/parser.json`); pass as many as needed. Format
(`tools/mutation/lib.ts` `specProblems` validates it):

```json
{
  "format": "recipe-extraction-mutations/v1",
  "owner": "who maintains this file",
  "description": "what these mutations check",
  "mutations": [
    {
      "id": "unique-id",                         // letters, digits, . _ -
      "description": "the fault this introduces",
      "file": "src/ingredient/semantic/engine.ts", // package-relative
      "find": "exact text",                      // must occur exactly once …
      "occurrence": 2,                           // … unless this picks one (1-based; optional)
      "replace": "replacement text",
      "tests": ["tests/semantic/units.test.ts"], // package-relative vitest file filters
      "testNamePattern": "optional -t pattern",
      "killedBy": [
        { "test": "describe title > test title", "reason": "^AssertionError: optional regex on the first line" }
      ],
      "expect": "KILLED"                         // KILLED | KILLED-UNEXPECTED | SURVIVED | ERROR
    }
  ]
}
```

(JSON has no comments; they are shown here for explanation only.) Test names are the vitest describe titles
and the test title joined by `" > "`. A mutation expected to be KILLED must name at least one killing test.
`specs/selftest.json` proves the classes: a no-op survives; a syntax break, missing or ambiguous anchor, missing
file, empty test selection and unknown killer are ERROR; a fault caught only by other tests, or by the intended
test for another reason, is KILLED-UNEXPECTED.
