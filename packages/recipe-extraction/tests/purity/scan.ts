/**
 * Static purity scanner for package source. It reads CODE, not comments: the TypeScript printer
 * re-emits each file with comments removed (regex and string literals intact), then
 *  - every import/export specifier must be relative (`./`, `../`);
 *  - forbidden references are searched in the comment-free text and in the syntax tree.
 * Tested against synthetic offending sources in purity.test.ts so it is known to fail when it should.
 */
import ts from "typescript";

export const FORBIDDEN_TEXT: readonly [RegExp, string][] = [
  [/["'`]node:/, "a node: module specifier"],
  [/\bprocess\b/, "process"],
  [/\bfetch\s*\(/, "fetch("],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest"],
  [/\bWebSocket\b/, "WebSocket"],
  [/\bconsole\s*\./, "console."],
  [/\bDate\b/, "Date"],
  [/\bMath\s*\.\s*random\b/, "Math.random"],
  [/\brequire\s*\(/, "require("],
  [/\bimport\s*\(/, "import("],
  [/\beval\s*\(/, "eval("],
  [/\bFunction\s*\(/, "Function("],
  [/\bglobalThis\b/, "globalThis"],
  [/\bimport\s*\.\s*meta\b/, "import.meta"],
];

const FORBIDDEN_IDENTIFIERS = new Set(["process", "fetch", "XMLHttpRequest", "WebSocket", "console", "Date", "require", "eval", "Function", "globalThis", "Deno", "Bun"]);

function parse(text: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

/** The file re-printed without comments. */
export function codeWithoutComments(text: string, fileName = "x.ts"): string {
  return ts.createPrinter({ removeComments: true }).printFile(parse(text, fileName));
}

/** Static and dynamic module specifiers of a file (dynamic ones only when written as a literal). */
export function moduleSpecifiers(text: string, fileName = "x.ts"): { static: string[]; dynamic: (string | null)[] } {
  const sf = parse(text, fileName);
  const out = { static: [] as string[], dynamic: [] as (string | null)[] };
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      out.static.push(node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
      out.static.push(node.moduleReference.expression.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      out.dynamic.push(arg && ts.isStringLiteralLike(arg) ? arg.text : null);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      out.static.push(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Problems of one package source file (empty = pure). */
export function scanSource(text: string, fileName = "x.ts"): string[] {
  const problems: string[] = [];
  const specs = moduleSpecifiers(text, fileName);
  for (const s of specs.static) if (!s.startsWith("./") && !s.startsWith("../")) problems.push(`non-relative import "${s}"`);
  if (specs.dynamic.length) problems.push("dynamic import()");
  const code = codeWithoutComments(text, fileName);
  for (const [re, label] of FORBIDDEN_TEXT) if (re.test(code)) problems.push(`forbidden: ${label}`);
  const sf = parse(text, fileName);
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      // A property NAME (x.fetch, { Date: 1 }) is not a reference to the global; everything else is.
      const p = node.parent;
      const isPropertyName = (ts.isPropertyAccessExpression(p) && p.name === node) || (ts.isPropertyAssignment(p) && p.name === node) || (ts.isPropertySignature(p) && p.name === node);
      if (!isPropertyName) problems.push(`forbidden identifier: ${node.text}`);
    }
    if (ts.isStringLiteralLike(node) && /^node:/.test(node.text)) problems.push(`node: specifier string "${node.text}"`);
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Math" && node.name.text === "random") problems.push("forbidden: Math.random");
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return [...new Set(problems)];
}

export const BIN_ALLOWED = new Set(["node:fs", "node:path", "node:url", "node:process"]);

/** Problems of a bin file: static imports only from the allow-list or relative paths; no literal dynamic import elsewhere. */
export function scanBin(text: string, fileName = "bin.ts"): string[] {
  const problems: string[] = [];
  const specs = moduleSpecifiers(text, fileName);
  for (const s of specs.static) if (!BIN_ALLOWED.has(s) && !s.startsWith("./") && !s.startsWith("../")) problems.push(`import "${s}" is not allowed in bin`);
  for (const s of specs.dynamic) if (s !== null && !s.startsWith("./") && !s.startsWith("../")) problems.push(`dynamic import "${s}" is not allowed in bin`);
  const code = codeWithoutComments(text, fileName);
  if (/\brequire\s*\(/.test(code)) problems.push("require( is not allowed in bin");
  if (/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/.test(code)) problems.push("network API in bin");
  return problems;
}
