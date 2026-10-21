import { getCurrentUser } from './actions/auth';
import { getQuizData } from './actions/quiz';
import { QuizEngine } from '@/components/QuizEngine';
import { SafeContainer } from '@qna/ui';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ set?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/login');
  }

  const { set } = await searchParams;
  const { lessons, questions, sets, selectedSetId, error } = await getQuizData(set);

  return (
    <SafeContainer>
      {error ? <div className="py-4 space-y-4">
        <div role="alert" className="alert alert-warning">{error}</div>
        <nav aria-label="Bộ đề khác" className="flex flex-col gap-2">
          {sets.map(set => <a key={set.id} href={`/?set=${encodeURIComponent(set.id)}`} className="btn btn-outline h-auto py-3">{set.title} — {set.questionCount} câu</a>)}
        </nav>
      </div> :
      <QuizEngine
        availableSets={sets}
        key={selectedSetId || 'preview'}
        setId={selectedSetId}
        setTitle={sets.find(set => set.id === selectedSetId)?.title}
        initialLessons={lessons}
        initialQuestions={questions}
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
      />}
    </SafeContainer>
  );
}
