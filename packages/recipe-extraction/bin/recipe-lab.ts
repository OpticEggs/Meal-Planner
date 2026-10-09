/**
 * recipe-lab — a local, offline command line over @table/recipe-extraction. It reads local files
 * only (an argument that looks like a URL is refused), never fetches anything and prints JSON.
 *
 * From packages/recipe-extraction:
 *   npx tsx bin/recipe-lab.ts line <text...> [--engine <id>]
 *   npx tsx bin/recipe-lab.ts page <file> --final-url <url> [--requested-url <url>] [--engine <id>]
 *   npx tsx bin/recipe-lab.ts engines
 *   npx tsx bin/recipe-lab.ts validate <file.json>
 *   npx tsx bin/recipe-lab.ts bench [...]         (needs the benchmark module, bench/cli.ts)
 *
 * Exit codes: 0 done; 1 `validate` found problems; 2 usage error, refused input or missing module.
 * Imports: node:fs, node:path, node:url, node:process and the package's own modules only.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  DEFAULT_ENGINE_ID, ENGINES, LIMITS, extractRecipePage, getEngine, validateParsedIngredientV1, validateRecipeExtractionV1,
} from "../src/index";

export interface Io {
  out(text: string): void;
  err(text: string): void;
}

const processIo: Io = {
  out: (t) => void process.stdout.write(t),
  err: (t) => void process.stderr.write(t),
};

/** Refused as a file path: anything with a URL scheme (`https://…`, `file://…`, `ftp://…`). */
export const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;
/** Largest file read: the page text limit plus 1 MiB of slack for multi-byte text. */
export const MAX_FILE_BYTES = LIMITS.maxHtmlChars + 1024 * 1024;

const USAGE = `usage:
  recipe-lab line <text...> [--engine <id>]
  recipe-lab page <file> --final-url <url> [--requested-url <url>] [--engine <id>]
  recipe-lab engines
  recipe-lab validate <file.json>
  recipe-lab bench [...]
`;

class CliError extends Error {
  constructor(message: string, readonly code = 2) {
    super(message);
  }
}

function parseArgs(args: string[], flagNames: readonly string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eqAt = a.indexOf("=");
      const name = eqAt < 0 ? a.slice(2) : a.slice(2, eqAt);
      if (!flagNames.includes(name)) throw new CliError(`unknown option --${name}\n${USAGE}`);
      const value = eqAt < 0 ? args[++i] : a.slice(eqAt + 1);
      if (value === undefined) throw new CliError(`--${name} needs a value`);
      flags[name] = value;
    } else positional.push(a);
  }
  return { positional, flags };
}

/** Reads a local file as text: refuses URLs, non-files and files over MAX_FILE_BYTES. */
export function readLocalFile(p: string): string {
  if (URL_LIKE.test(p)) throw new CliError("recipe-lab reads local files only");
  let st: fs.Stats;
  try {
    st = fs.statSync(p);
  } catch {
    throw new CliError(`cannot read ${path.basename(p)}: no such file`);
  }
  if (!st.isFile()) throw new CliError(`cannot read ${path.basename(p)}: not a regular file`);
  if (st.size > MAX_FILE_BYTES) throw new CliError(`refused ${path.basename(p)}: larger than ${MAX_FILE_BYTES} bytes`);
  return fs.readFileSync(p, "utf8");
}

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

function engineFlag(flags: Record<string, string>): string {
  const id = flags.engine ?? DEFAULT_ENGINE_ID;
  try {
    return getEngine(id).id;
  } catch (e) {
    throw new CliError((e as Error).message);
  }
}

async function bench(rest: string[], io: Io): Promise<number> {
  const file = fileURLToPath(new URL("../bench/cli.ts", import.meta.url));
  if (!fs.existsSync(file)) {
    io.err("benchmark not installed in this build\n");
    return 2;
  }
  let mod: { main?: (argv: string[]) => Promise<number> };
  try {
    mod = (await import(pathToFileURL(file).href)) as typeof mod;
  } catch (e) {
    io.err(`benchmark not installed in this build (${(e as Error).message})\n`);
    return 2;
  }
  if (typeof mod.main !== "function") {
    io.err("benchmark not installed in this build (bench/cli.ts has no main)\n");
    return 2;
  }
  return await mod.main(rest);
}

/** Runs one command. Never exits the process; returns the exit code. */
export async function main(argv: string[], io: Io = processIo): Promise<number> {
  const [command, ...rest] = argv;
  try {
    switch (command) {
      case "line": {
        const { positional, flags } = parseArgs(rest, ["engine"]);
        if (!positional.length) throw new CliError(`line needs the ingredient text\n${USAGE}`);
        const engine = engineFlag(flags);
        io.out(json(ENGINES[engine].parse(positional.join(" "))));
        return 0;
      }
      case "page": {
        const { positional, flags } = parseArgs(rest, ["engine", "final-url", "requested-url"]);
        if (positional.length !== 1) throw new CliError(`page needs exactly one local file\n${USAGE}`);
        const finalUrl = flags["final-url"];
        if (finalUrl === undefined) throw new CliError("page needs --final-url <url> (the address that answered; relative links resolve against it)");
        const engine = engineFlag(flags);
        const html = readLocalFile(positional[0]);
        io.out(json(extractRecipePage(html, { requestedUrl: flags["requested-url"] ?? finalUrl, finalUrl }, { engine })));
        return 0;
      }
      case "engines": {
        parseArgs(rest, []);
        io.out(json(Object.values(ENGINES).map((e) => ({ id: e.id, default: e.id === DEFAULT_ENGINE_ID, description: e.description }))));
        return 0;
      }
      case "validate": {
        const { positional } = parseArgs(rest, []);
        if (positional.length !== 1) throw new CliError(`validate needs exactly one local JSON file\n${USAGE}`);
        let value: unknown;
        try {
          value = JSON.parse(readLocalFile(positional[0]));
        } catch (e) {
          if (e instanceof CliError) throw e;
          throw new CliError(`${path.basename(positional[0])} is not valid JSON`);
        }
        const isPage = typeof value === "object" && value !== null && !Array.isArray(value) && "schemaVersion" in value;
        const problems = isPage
          ? validateRecipeExtractionV1(value)
          : Array.isArray(value)
            ? value.flatMap((v, i) => validateParsedIngredientV1(v, `ingredient[${i}]`))
            : validateParsedIngredientV1(value);
        io.out(json({ kind: isPage ? "RecipeExtractionV1" : Array.isArray(value) ? "ParsedIngredientV1[]" : "ParsedIngredientV1", valid: problems.length === 0, problems }));
        return problems.length ? 1 : 0;
      }
      case "bench":
        return await bench(rest, io);
      case undefined:
      case "help":
      case "--help":
      case "-h":
        io.out(USAGE);
        return command === undefined ? 2 : 0;
      default:
        throw new CliError(`unknown command ${JSON.stringify(command)}\n${USAGE}`);
    }
  } catch (e) {
    if (e instanceof CliError) {
      io.err(e.message.startsWith("recipe-lab") ? `${e.message}\n` : `recipe-lab: ${e.message}\n`);
      return e.code;
    }
    throw e;
  }
}

function isEntryPoint(): boolean {
  try {
    const script = process.argv[1];
    return script !== undefined && fs.realpathSync(script) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (e: unknown) => {
      process.stderr.write(`recipe-lab: ${(e as Error)?.message ?? String(e)}\n`);
      process.exitCode = 2;
    },
  );
}
