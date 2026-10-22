import { MenuEditor } from "@/components/admin/content/menu-editor";

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <MenuEditor menuKey={decodeURIComponent(key)} />;
}
