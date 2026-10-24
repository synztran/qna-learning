import { getCurrentUser } from '@/app/actions/auth';
import { ProfileView } from '@/components/ProfileView';
import { SessionGuard } from '@/components/SessionGuard';
import { SafeContainer } from '@qna/ui';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/login');
  }

  const profileUser = user || {
    id: 'demo-user',
    email: 'demo@studywithmsnhung.edu',
    displayName: 'Học viên Demo',
    userName: 'demo',
  };

  return (
    <SafeContainer>
      {user && <SessionGuard />}
      <ProfileView user={profileUser} />
    </SafeContainer>
  );
}
