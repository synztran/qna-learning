import { getCurrentUser } from './actions/auth';
import { getQuizData } from './actions/quiz';
import { QuizEngine } from '@/components/QuizEngine';
import { SafeContainer } from '@qna/ui';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/login');
  }

  const { lessons, questions } = await getQuizData();

  return (
    <SafeContainer>
      <QuizEngine
        initialLessons={lessons}
        initialQuestions={questions}
        user={user ? { displayName: user.displayName, email: user.email } : undefined}
      />
    </SafeContainer>
  );
}
