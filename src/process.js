import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from './parser.js';
import { generateSummary, extractConcepts, findConnections } from './llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

/**
 * Process raw files and generate wiki
 */
export async function processRawFiles() {
  const rawDir = path.join(__dirname, '..', config.paths.raw);
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);

  // Ensure wiki directories exist
  await fs.mkdir(path.join(wikiDir, 'summaries'), { recursive: true });
  await fs.mkdir(path.join(wikiDir, 'concepts'), { recursive: true });
  await fs.mkdir(path.join(wikiDir, 'connections'), { recursive: true });
  await fs.mkdir(path.join(wikiDir, 'insights'), { recursive: true });

  console.log('🚀 Starting knowledge processing...');
  console.log(`📂 Raw directory: ${rawDir}`);
  console.log(`📝 Wiki directory: ${wikiDir}`);

  // Get all files from raw directory
  const files = await getAllFiles(rawDir);
  console.log(`📄 Found ${files.length} files to process`);

  // Process each file
  for (const file of files) {
    await processFile(file, wikiDir);
  }

  console.log('✅ Processing complete!');
}

/**
 * Get all files recursively from a directory
 */
async function getAllFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist yet
    console.log(`⚠️  Directory not found: ${dir}`);
  }
  
  return files;
}

/**
 * Process a single file
 */
async function processFile(filePath, wikiDir) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  console.log(`📄 Processing: ${fileName}`);

  // Extract text from file
  let content;
  try {
    content = await extractText(filePath);
    if (!content || content.trim().length === 0) {
      console.log(`  ⚠️  No content extracted from ${fileName}`);
      return;
    }
  } catch (error) {
    console.log(`  ⚠️  Could not extract text from ${fileName}`);
    return;
  }

  // Generate summary
  if (config.processing.autoSummarize) {
    try {
      const summary = await generateSummary(fileName, content);
      const summaryPath = path.join(wikiDir, 'summaries', `${path.parse(fileName).name}.md`);
      await fs.writeFile(summaryPath, summary);
      console.log(`  ✓ Summary created`);
    } catch (error) {
      console.log(`  ⚠️  Failed to generate summary: ${error.message}`);
    }
  }

  // Extract concepts
  if (config.processing.extractConcepts) {
    try {
      const concepts = await extractConcepts(content);
      for (const concept of concepts) {
        const conceptPath = path.join(wikiDir, 'concepts', `${concept.slug}.md`);
        await updateConceptPage(conceptPath, concept, fileName);
      }
      console.log(`  ✓ Concepts extracted: ${concepts.length}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to extract concepts: ${error.message}`);
    }
  }
}

/**
 * Update concept page with new reference
 */
async function updateConceptPage(conceptPath, concept, sourceFile) {
  let content = '';
  
  // Check if concept page already exists
  try {
    content = await fs.readFile(conceptPath, 'utf-8');
  } catch (error) {
    // Create new concept page
    content = `---
title: ${concept.name}
type: concept
tags: [concept]
created: ${new Date().toISOString()}
---

# ${concept.name}

## Definition
${concept.definition}

## Importance
${concept.importance}

## Related Concepts

## Mentioned In
- [[${path.parse(sourceFile).name}]]
`;
    await fs.writeFile(conceptPath, content);
    return;
  }
  
  // Add backlink if not already present
  const backlink = `- [[${path.parse(sourceFile).name}]]`;
  if (!content.includes(backlink)) {
    content = content.replace(
      '## Mentioned In',
      `## Mentioned In\n${backlink}`
    );
    await fs.writeFile(conceptPath, content);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processRawFiles().catch(console.error);
}
