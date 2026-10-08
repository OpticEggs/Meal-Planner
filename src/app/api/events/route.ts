import { actorFrom } from "@/server/session";
import { pool } from "@/server/db/pool";

export const dynamic = "force-dynamic";

/** Household change stream (server-sent events). Each event carries the household sequence
 *  number. It is an invalidation signal only: clients re-fetch the authoritative snapshot. */
export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return new Response("not signed in", { status: 401 });
  let after = Number(new URL(req.url).searchParams.get("after") ?? "0") || 0;
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        if (!closed) controller.enqueue(encoder.encode(s));
      };
      send(`retry: 2000\n\n`);
      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {}
      });
      let ticks = 0;
      while (!closed) {
        try {
          const r = await pool().query(
            "SELECT seq, command, summary FROM change_events WHERE household_id=$1 AND seq > $2 ORDER BY seq LIMIT 50",
            [actor.householdId, after],
          );
          for (const row of r.rows) {
            after = row.seq;
            send(`id: ${row.seq}\nevent: change\ndata: ${JSON.stringify({ seq: row.seq, command: row.command, text: row.summary.text ?? null })}\n\n`);
          }
          if (++ticks % 20 === 0) send(`: keepalive\n\n`);
        } catch {
          // transient DB error: the client still refetches on reconnect/foreground
        }
        await new Promise((res) => setTimeout(res, 500));
      }
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" } });
}
