import { tableEnv } from "./env";

/** Structured diagnostic log: command ids, revisions, conflict reasons, integration
 *  outcomes. Never tokens, secrets or request credentials. */
export function log(entry: Record<string, unknown>): void {
  if (tableEnv() === "test" && !process.env.TABLE_LOG) return;
  console.log(JSON.stringify({ t: new Date().toISOString(), ...entry }));
}
