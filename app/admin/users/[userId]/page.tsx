import { AdminUserEditor } from "@/components/admin-user-editor";

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <AdminUserEditor userId={userId} />;
}
