import { CookScreen } from "@/ui/Cook";
export default async function Page({ params }: { params: Promise<{ night: string }> }) {
  const { night } = await params;
  return <CookScreen night={night} />;
}
