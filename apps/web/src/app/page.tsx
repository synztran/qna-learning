import { getCurrentUser } from './actions/auth';
import { getQuizData } from './actions/quiz';
import { QuizEngine } from '@/components/QuizEngine';
import { SessionGuard } from '@/components/SessionGuard';
import { SafeContainer } from '@qna/ui';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/login');
  }

  const { lessons, questions, sets, selectedSetId, error } = await getQuizData();

  return (
    <SafeContainer>
      {user && <SessionGuard />}
      {error && sets.length === 0 ? <div className="py-4 space-y-4">
        <div role="alert" className="alert alert-warning">{error}</div>
        <a href="/" className="btn btn-outline">Thử lại</a>
      </div> :
      <QuizEngine
        availableSets={sets}
        key={selectedSetId || 'preview'}
        setId={selectedSetId}
        setTitle={sets.find(set => set.id === selectedSetId)?.title}
        initialLessons={lessons}
        initialQuestions={questions}
        user={user ? {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          donorLevel: user.donorLevel,
          donorTier: user.donorTier,
        } : undefined}
      />}
    </SafeContainer>
  );
}
