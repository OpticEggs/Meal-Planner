/** TEST-ONLY helpers to drive the Kroger connection through the recording fake transport. */
import type { Actor } from "@/server/commands/framework";
import { completeAuthorization, startAuthorization } from "@/server/integrations/kroger/connection";
import { krogerFake } from "@/server/integrations/kroger/transport";
import { json, tokenBody } from "./env";

export async function startFor(actor: Actor): Promise<{ state: string; challenge: string; url: URL }> {
  const r = await startAuthorization(actor);
  if (!r.ok) throw new Error(`start refused: ${r.code} ${r.message}`);
  const url = new URL(r.authorizeUrl);
  return { state: url.searchParams.get("state")!, challenge: url.searchParams.get("code_challenge")!, url };
}

/** Full connection with fake tokens numbered n. Leaves the fake responder unset afterwards. */
export async function connect(actor: Actor, n = 1, expiresIn: number | null = 1800) {
  const { state } = await startFor(actor);
  krogerFake.respond(() => json(200, tokenBody(n, expiresIn)));
  const res = await completeAuthorization(actor, { code: `fake-auth-code-${n}`, state });
  krogerFake.respond(() => {
    throw new Error("no response scripted");
  });
  if (res !== "connected") throw new Error(`connect failed: ${res}`);
}
