// Runs once when the server process starts. A batch left in dispatch_started by a
// previous process has an unknown external outcome: mark it uncertain, never replay it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;
  try {
    const { recoverInterruptedDispatches } = await import("./server/commands/purchasing");
    const n = await recoverInterruptedDispatches(0);
    if (n) console.log(JSON.stringify({ at: "startup-recovery", uncertainBatches: n }));
  } catch (e) {
    console.error(JSON.stringify({ at: "startup-recovery", error: (e as Error).message }));
  }
}
