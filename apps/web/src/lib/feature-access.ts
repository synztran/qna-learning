import {
  DEFAULT_FEATURE_ACCESS,
  LEARNING_FEATURE_CONFIGS,
  LEARNING_FEATURE_KEYS,
  getDonorTierByLevel,
  type FeatureAccessMap,
  type LearningFeatureKey,
} from '@qna/types';

export async function readFeatureAccess(supabase: any): Promise<FeatureAccessMap> {
  try {
    const { data, error } = await supabase
      .from('feature_access_config')
      .select('feature_key, min_donor_level');
    if (error) return { ...DEFAULT_FEATURE_ACCESS };

    const saved = new Map((data || []).map((row: any) => [row.feature_key, Number(row.min_donor_level)]));
    return LEARNING_FEATURE_KEYS.reduce((access, key) => ({
      ...access,
      [key]: Number.isFinite(saved.get(key)) ? saved.get(key)! : DEFAULT_FEATURE_ACCESS[key],
    }), { ...DEFAULT_FEATURE_ACCESS });
  } catch {
    return { ...DEFAULT_FEATURE_ACCESS };
  }
}

export async function getFeatureAccessError(
  supabase: any,
  userId: string,
  featureKey: LearningFeatureKey,
): Promise<string | null> {
  const [{ data: profile }, access] = await Promise.all([
    supabase.from('profiles').select('donor_level').eq('id', userId).maybeSingle(),
    readFeatureAccess(supabase),
  ]);
  const minLevel = access[featureKey];
  if ((profile?.donor_level ?? 0) >= minLevel) return null;

  const tier = getDonorTierByLevel(minLevel);
  const label = LEARNING_FEATURE_CONFIGS[featureKey].label;
  return `${label} yêu cầu cấp bậc ${tier?.label ?? 'tri ân'} trở lên.`;
}
