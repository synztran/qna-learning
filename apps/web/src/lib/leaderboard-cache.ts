import type { LeaderboardRow } from './learning-records';

export const LEADERBOARD_CACHE_TTL = 8 * 60 * 60 * 1000;

// Owned by QuizEngine, so quiz-view unmounts preserve it without sharing users' data.
export function createLeaderboardCache() {
  return {
    rows: null as LeaderboardRow[] | null,
    fetchedAt: 0,
    request: null as Promise<{ rows: LeaderboardRow[]; error?: string }> | null,
  };
}

export type LeaderboardCache = ReturnType<typeof createLeaderboardCache>;
