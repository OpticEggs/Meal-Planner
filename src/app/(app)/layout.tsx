import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actorFrom } from "@/server/session";
import { HouseholdProvider } from "@/ui/store";
import { Shell } from "@/ui/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await actorFrom(await headers());
  if (!actor) redirect("/login");
  return (
    <HouseholdProvider me={{ memberId: actor.memberId, displayName: actor.displayName }}>
      <Shell>{children}</Shell>
    </HouseholdProvider>
  );
}
