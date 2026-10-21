'use server';

import { getLeaderboard } from '@/lib/learning-records';

export async function loadLeaderboard() {
  return getLeaderboard();
}
