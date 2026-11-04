import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { AppearanceEditor } from "@/components/admin/appearance-editor";

export const metadata = { title: "Appearance" };

export default async function Appearance() {
  const [s, cats] = await Promise.all([getSettings(), db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } })]);
  return (
    <div>
      <PageHeader title="Appearance" description="Design your store: colours, fonts, logo, menu and the homepage layout." />
      <AppearanceEditor initial={s} categories={cats} />
    </div>
  );
}
