import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { UserManagementSection } from '@/components/dashboard/user-management-section';
import { checkIsSystemAdmin } from '@/lib/actions/check-user';
import { listUsers } from '@/lib/actions/admin-user';
import { getUserInfo } from '@/lib/user';
import { PageSpinner, PageError } from '@/components/dashboard/page-status';


async function AdminContent() {
  try {
    const user = await getUserInfo();

    if (!user) {
      redirect('/login');
    }

    const isSystemAdmin = await checkIsSystemAdmin(user.id);

    if (!isSystemAdmin) {
      redirect('/dashboard');
    }

    const result = await listUsers();
    const users = result.success ? result.users : [];

    return (
      <div className="flex flex-col gap-6 flex-1">
        <h1 className="text-2xl font-bold text-[#1A1D20]">Administration</h1>
        <UserManagementSection users={users} />
      </div>
    );
  } catch (error) {
    console.error('Error loading admin page:', error);
    return <PageError message="Failed to load admin page. Please try again." />;
  }
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminContent />
    </Suspense>
  );
}
