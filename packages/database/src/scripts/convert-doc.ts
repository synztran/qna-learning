import fs from 'fs';
import path from 'path';
import { convertDocxBufferToQuizData } from '../doc-converter';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
Usage:
  pnpm convert:doc <path-to-docx-file> [output-path.json]

Examples:
  pnpm convert:doc apps/admin/src/question_sources/source_1.docx
  pnpm convert:doc my_exam.docx data/question-sources/my_exam.json
`);
    process.exit(1);
  }

  const workingDir = process.env.INIT_CWD || process.cwd();
  const inputPath = path.isAbsolute(args[0]) ? args[0] : path.resolve(workingDir, args[0]);
  if (!fs.existsSync(inputPath)) {
    // Try process.cwd() fallback
    const altPath = path.resolve(process.cwd(), args[0]);
    if (fs.existsSync(altPath)) {
      // found
    } else {
      console.error(`File not found: ${inputPath}`);
      process.exit(1);
    }
  }

  const resolvedInputPath = fs.existsSync(inputPath) ? inputPath : path.resolve(process.cwd(), args[0]);
  const fileName = path.basename(resolvedInputPath);
  const ext = path.extname(resolvedInputPath).toLowerCase();

  let outputPath = args[1];
  if (!outputPath) {
    const baseName = path.basename(resolvedInputPath, ext);
    outputPath = path.resolve(path.dirname(resolvedInputPath), `${baseName}.json`);
  } else {
    outputPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(workingDir, outputPath);
  }

  console.log(`Converting "${fileName}" -> "${path.basename(outputPath)}"...`);

  const buffer = fs.readFileSync(inputPath);
  const result = await convertDocxBufferToQuizData(buffer, { fileName });

  if (!result.success || !result.data) {
    console.error('Conversion failed:', result.error || 'Unknown error');
    if (result.warnings?.length) {
      console.warn('Warnings:', result.warnings);
    }
    process.exit(1);
  }

  // Ensure output dir exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2), 'utf-8');

  console.log(`\n Successfully converted:`);
  console.log(`- Title: ${result.data.title}`);
  console.log(`- Slug: ${result.data.slug}`);
  console.log(`- Total questions: ${result.totalQuestions}`);
  console.log(`- Total lessons: ${result.data.lessons.length}`);
  console.log(`- Saved to: ${outputPath}`);

  if (result.warnings && result.warnings.length > 0) {
    console.log(`- Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.log(`   * ${w}`));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
