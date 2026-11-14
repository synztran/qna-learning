import { getCurrentUser } from '@/app/actions/auth';
import { getLearningSets, getLearningStats } from '@/app/actions/learning';
import { StatsView } from '@/components/StatsView';
import { SessionGuard } from '@/components/SessionGuard';
import { SafeContainer } from '@qna/ui';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/login');
  }

  const params = await searchParams;
  const selectedSetId = typeof params?.set === 'string' ? params.set : undefined;
  const [{ sets }, result] = await Promise.all([
    getLearningSets(),
    getLearningStats(selectedSetId, 30),
  ]);

  return (
    <SafeContainer>
      {user && <SessionGuard />}
      <StatsView
        sets={sets}
        initialSetId={selectedSetId || ''}
        initialStats={result.stats}
        initialError={result.error}
      />
    </SafeContainer>
  );
}
