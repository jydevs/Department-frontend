import { CollectionEditor } from "@/components/admin/collections/collection-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionEditor id={id} />;
}
