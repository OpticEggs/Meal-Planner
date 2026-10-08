// Runs once when the server process starts. A batch left in dispatch_started has an unknown
// external outcome once it is older than the dispatch recovery bound: mark it uncertain, never replay
// it. Younger ones may belong to another live process (an overlapping deploy), so they are left alone
// and a periodic sweep picks them up if that process stops. (B9)
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;
  const { startupRecovery } = await import("./server/commands/purchasing");
  const { recoverySweepIntervalMs } = await import("./server/env");
  const run = async (at: string) => {
    try {
      const n = await startupRecovery();
      if (n) console.log(JSON.stringify({ at, uncertainBatches: n }));
    } catch (e) {
      console.error(JSON.stringify({ at, error: (e as Error).message }));
    }
  };
  await run("startup-recovery");
  setInterval(() => void run("recovery-sweep"), recoverySweepIntervalMs()).unref();
}
