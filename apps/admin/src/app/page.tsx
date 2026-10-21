import { listUsers, listQuestions, listQuestionSourcesFromFolder } from './actions/admin';
import { AdminDashboard } from '@/components/AdminDashboard';
import { parseQuizJson, DEFAULT_SEED_DATA } from '@qna/database';
import type { Question, UserProfile } from '@qna/types';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const hasEnv = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let users: UserProfile[] = [];
  let questions: Question[] = [];

  const [folderSourcesRes, usersRes, questionsRes] = await Promise.all([
    listQuestionSourcesFromFolder(),
    hasEnv ? listUsers() : Promise.resolve({ users: [] }),
    hasEnv ? listQuestions() : Promise.resolve({ questions: [] }),
  ]);

  if (hasEnv) {
    users = usersRes.users || [];
    questions = questionsRes.questions || [];
  }

  // Fallback to sample data for local preview if DB is empty or env not set
  if (questions.length === 0) {
    questions = parseQuizJson(DEFAULT_SEED_DATA).questions;
  }

  if (users.length === 0) {
    users = [
      {
        id: 'sample-admin-1',
        email: 'teacher@studywithmsnhung.edu',
        displayName: 'Ms. Nhung (Admin)',
        isBanned: false,
        role: 'admin' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'sample-student-1',
        email: 'student.demo@studywithmsnhung.edu',
        displayName: 'Học viên Demo',
        isBanned: false,
        role: 'student' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  return (
    <AdminDashboard
      initialUsers={users}
      initialQuestions={questions}
      initialFolderSources={folderSourcesRes.sources || []}
      initialFolderPath={folderSourcesRes.folderPath || ''}
      hasEnv={hasEnv}
    />
  );
}
