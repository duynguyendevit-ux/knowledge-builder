import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from './parser.js';
import { generateSummary, extractConcepts, findConnections } from './llm.js';
import { updateProcessingStatus, addProcessingLog, resetProcessingStatus, getProcessingStatus } from './status.js';

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

  // Reset and initialize status
  resetProcessingStatus();
  updateProcessingStatus({
    isProcessing: true,
    startTime: new Date().toISOString()
  });
  addProcessingLog('Starting knowledge processing...');

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
  
  updateProcessingStatus({
    totalFiles: files.length
  });
  addProcessingLog(`Found ${files.length} files to process`);

  // Process each file
  for (const file of files) {
    await processFile(file, wikiDir);
  }

  console.log('✅ Processing complete!');
  addProcessingLog('Processing complete!');
  updateProcessingStatus({
    isProcessing: false
  });
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
  
  updateProcessingStatus({
    currentFile: fileName
  });
  addProcessingLog(`Processing: ${fileName}`);
  
  console.log(`📄 Processing: ${fileName}`);

  // Extract text from file
  let content;
  try {
    content = await extractText(filePath);
    if (!content || content.trim().length === 0) {
      console.log(`  ⚠️  No content extracted from ${fileName}`);
      addProcessingLog(`No content extracted from ${fileName}`);
      return;
    }
  } catch (error) {
    console.log(`  ⚠️  Could not extract text from ${fileName}`);
    addProcessingLog(`Error extracting text from ${fileName}: ${error.message}`);
    return;
  }

  // Generate summary
  if (config.processing.autoSummarize) {
    try {
      addProcessingLog(`Generating summary for ${fileName}...`);
      const summary = await generateSummary(fileName, content);
      const summaryPath = path.join(wikiDir, 'summaries', `${path.parse(fileName).name}.md`);
      await fs.writeFile(summaryPath, summary);
      console.log(`  ✓ Summary created`);
      addProcessingLog(`Summary created for ${fileName}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to generate summary: ${error.message}`);
      addProcessingLog(`Failed to generate summary: ${error.message}`);
    }
  }

  // Extract concepts
  if (config.processing.extractConcepts) {
    try {
      addProcessingLog(`Extracting concepts from ${fileName}...`);
      const concepts = await extractConcepts(content);
      for (const concept of concepts) {
        const conceptPath = path.join(wikiDir, 'concepts', `${concept.slug}.md`);
        await updateConceptPage(conceptPath, concept, fileName);
      }
      console.log(`  ✓ Concepts extracted: ${concepts.length}`);
      addProcessingLog(`Extracted ${concepts.length} concepts from ${fileName}`);
    } catch (error) {
      console.log(`  ⚠️  Failed to extract concepts: ${error.message}`);
      addProcessingLog(`Failed to extract concepts: ${error.message}`);
    }
  }
  
  // Update processed count
  const status = getProcessingStatus();
  updateProcessingStatus({
    processedFiles: (status.processedFiles || 0) + 1
  });
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
source: ${concept.source || 'INFERRED'}
confidence: ${concept.confidence || 0.8}
created: ${new Date().toISOString()}
---

# ${concept.name}

**Source:** ${concept.source || 'INFERRED'} | **Confidence:** ${(concept.confidence || 0.8).toFixed(2)}

## Definition
${concept.definition}

## Importance
${concept.importance}

## Related Concepts

## Mentioned In
- [[${path.parse(sourceFile).name}]] (${concept.source || 'INFERRED'}, confidence: ${(concept.confidence || 0.8).toFixed(2)})
`;
    await fs.writeFile(conceptPath, content);
    return;
  }
  
  // Add backlink if not already present
  const backlink = `- [[${path.parse(sourceFile).name}]] (${concept.source || 'INFERRED'}, confidence: ${(concept.confidence || 0.8).toFixed(2)})`;
  if (!content.includes(`[[${path.parse(sourceFile).name}]]`)) {
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
