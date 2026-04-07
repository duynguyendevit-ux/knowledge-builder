import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

  // Read file content
  let content;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.log(`⚠️  Could not read file: ${fileName}`);
    return;
  }

  // Generate summary
  if (config.processing.autoSummarize) {
    const summary = await generateSummary(fileName, content);
    const summaryPath = path.join(wikiDir, 'summaries', `${path.parse(fileName).name}.md`);
    await fs.writeFile(summaryPath, summary);
    console.log(`  ✓ Summary created`);
  }

  // Extract concepts
  if (config.processing.extractConcepts) {
    const concepts = await extractConcepts(content);
    for (const concept of concepts) {
      const conceptPath = path.join(wikiDir, 'concepts', `${concept.slug}.md`);
      await updateConceptPage(conceptPath, concept, fileName);
    }
    console.log(`  ✓ Concepts extracted: ${concepts.length}`);
  }
}

/**
 * Generate summary for a document
 */
async function generateSummary(fileName, content) {
  // TODO: Call LLM to generate summary
  // For now, return a template
  
  const summary = `---
title: ${fileName}
tags: [summary]
created: ${new Date().toISOString()}
---

# ${fileName}

## Summary

[Auto-generated summary will go here]

## Key Points

- Point 1
- Point 2
- Point 3

## Related Concepts

- [[concept-1]]
- [[concept-2]]

## Source

\`\`\`
${content.substring(0, 500)}...
\`\`\`
`;

  return summary;
}

/**
 * Extract concepts from content
 */
async function extractConcepts(content) {
  // TODO: Call LLM to extract concepts
  // For now, return empty array
  return [];
}

/**
 * Update concept page with new reference
 */
async function updateConceptPage(conceptPath, concept, sourceFile) {
  // TODO: Update or create concept page
  // Add backlink to source file
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processRawFiles().catch(console.error);
}
