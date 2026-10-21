'use server';

import { getHistory, getAttempt } from '@/lib/learning-records';
import { historyPage } from '@/lib/submissions';

export async function loadHistory(page: number) {
  return getHistory(historyPage(String(page)));
}

export async function loadHistoryAttempt(id: string) {
  return getAttempt(id);
}
