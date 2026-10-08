import { NextResponse } from "next/server";
import { actorFrom } from "@/server/session";
import { withClient } from "@/server/db/pool";
import { exportHousehold } from "@/server/export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await actorFrom(req.headers);
  if (!actor) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const data = await withClient(async (c) => {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      return await exportHousehold(c, actor.householdId);
    } finally {
      await c.query("COMMIT");
    }
  });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="table-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
