import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';
import seedDataRaw from '../seed/sc5_mon_md1.json';
import { parseQuizJson } from '../index';

async function runSeed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);
  console.log('🌱 Starting seed for NoobTeam...');

  // 1. Quiz Set
  const { data: setRecord, error: setError } = await supabase
    .from('quiz_sets')
    .upsert(
      {
        slug: 'sc5-mon-md1',
        title: 'NoobTeam',
        description: 'Ngân hàng câu hỏi trắc nghiệm Hàng không dân dụng',
        is_active: true,
        storage_file_path: 'sc5_mon_md1.json',
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (setError || !setRecord) {
    console.error('❌ Error creating quiz set:', setError);
    process.exit(1);
  }

  console.log(`✅ Quiz Set: ${setRecord.title} (${setRecord.id})`);

  const { lessons, questions } = parseQuizJson(seedDataRaw as any);

  // 2. Lessons
  const lessonIdMap: Record<number, string> = {};
  for (const l of lessons) {
    const { data: lRecord, error: lError } = await supabase
      .from('lessons')
      .upsert(
        {
          set_id: setRecord.id,
          lesson_num: l.n,
          title: l.title,
          source_doc: l.src || null,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (lError || !lRecord) {
      console.error(`❌ Error inserting lesson ${l.n}:`, lError);
    } else {
      lessonIdMap[l.n] = lRecord.id;
    }
  }

  console.log(`✅ Upserted ${Object.keys(lessonIdMap).length} lessons.`);

  // 3. Questions
  await supabase.from('questions').delete().eq('set_id', setRecord.id);

  const questionsToInsert = questions.map((q) => ({
    set_id: setRecord.id,
    lesson_id: lessonIdMap[q.lesson] || null,
    lesson_num: q.lesson,
    question_order: q.n,
    question_text: q.q,
    options: q.opts as any,
    correct_option: q.ans,
    answer_text: q.ansText || q.opts[q.ans],
    explanation: q.exp,
    source_ref: q.src,
    is_active: true,
  }));

  const chunkSize = 50;
  for (let i = 0; i < questionsToInsert.length; i += chunkSize) {
    const chunk = questionsToInsert.slice(i, i + chunkSize);
    const { error: qError } = await supabase.from('questions').insert(chunk);
    if (qError) {
      console.error(`❌ Error inserting questions batch ${i}:`, qError);
    }
  }

  console.log(`✅ Seeded ${questionsToInsert.length} questions successfully!`);
}

runSeed().catch((e) => {
  console.error(e);
  process.exit(1);
});
