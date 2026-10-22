import { TemplateEditor } from "@/components/admin/emails/template-editor";

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <TemplateEditor templateKey={key} />;
}
