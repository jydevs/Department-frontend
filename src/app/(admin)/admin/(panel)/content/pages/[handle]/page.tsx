import { PageEditor } from "@/components/admin/content/page-editor";

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <PageEditor handle={decodeURIComponent(handle)} />;
}
