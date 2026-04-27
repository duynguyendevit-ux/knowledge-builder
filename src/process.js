import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from './parser.js';
import { generateSummary, extractConcepts, findConnections } from './llm.js';
import { updateProcessingStatus, addProcessingLog, resetProcessingStatus, getProcessingStatus } from './status.js';
import { needsProcessing, markProcessed } from './cache.js';
import { isCodeFile, processCodeFile, generateCodeDoc } from './code-processor.js';
import { getKnowledgeGraph } from './knowledge-graph.js';

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

  // Initialize knowledge graph
  const graph = getKnowledgeGraph();
  console.log('📊 Initializing knowledge graph...');

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

  // Check cache
  const needsUpdate = await needsProcessing(filePath);
  if (!needsUpdate) {
    console.log(`  ⏭️  Skipped (unchanged)`);
    addProcessingLog(`Skipped ${fileName} (unchanged)`);
    
    // Still update processed count
    const status = getProcessingStatus();
    updateProcessingStatus({
      processedFiles: (status.processedFiles || 0) + 1
    });
    return;
  }

  // Check if it's a code file
  if (isCodeFile(filePath)) {
    console.log(`  🔧 Code file detected, using Tree-sitter parser`);
    addProcessingLog(`Parsing code file: ${fileName}`);
    
    try {
      const parsed = await processCodeFile(filePath);
      if (parsed) {
        // Get knowledge graph
        const graph = getKnowledgeGraph();
        
        // Add document to graph
        await graph.addDocument(fileName, {
          created: new Date().toISOString(),
          type: 'code',
          summary: `Code file with ${parsed.symbols.functions.length} functions, ${parsed.symbols.classes.length} classes`
        });
        
        // Generate code documentation
        const codeDoc = generateCodeDoc(parsed, fileName);
        const docPath = path.join(wikiDir, 'summaries', `${path.parse(fileName).name}.md`);
        await fs.writeFile(docPath, codeDoc);
        console.log(`  ✓ Code documentation created`);
        addProcessingLog(`Code documentation created for ${fileName}`);
        
        // Extract concepts from code symbols
        const concepts = extractCodeConcepts(parsed);
        for (const concept of concepts) {
          // Add concept to graph
          await graph.addConcept(concept.slug, concept);
          
          // Link concept to document in graph
          await graph.linkConceptToDocument(concept.slug, fileName, concept.confidence);
          
          // Create concept markdown file
          const conceptPath = path.join(wikiDir, 'concepts', `${concept.slug}.md`);
          await updateConceptPage(conceptPath, concept, fileName);
        }
        
        // Add dependencies to graph
        if (parsed.dependencies) {
          for (const dep of parsed.dependencies) {
            await graph.addDependency(fileName, dep);
          }
        }
        
        console.log(`  ✓ Concepts extracted: ${concepts.length}`);
        addProcessingLog(`Extracted ${concepts.length} concepts from ${fileName}`);
        
        // Mark as processed
        await markProcessed(filePath, concepts, codeDoc);
        
        // Update processed count
        const status = getProcessingStatus();
        updateProcessingStatus({
          processedFiles: (status.processedFiles || 0) + 1
        });
        return;
      }
    } catch (error) {
      console.log(`  ⚠️  Code parsing failed, falling back to text extraction`);
      addProcessingLog(`Code parsing failed for ${fileName}: ${error.message}`);
    }
  }

  // Extract text from file (fallback for non-code or failed code parsing)
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

  let summary = null;
  let concepts = [];

  // Get knowledge graph
  const graph = getKnowledgeGraph();

  // Generate summary
  if (config.processing.autoSummarize) {
    try {
      addProcessingLog(`Generating summary for ${fileName}...`);
      summary = await generateSummary(fileName, content);
      const summaryPath = path.join(wikiDir, 'summaries', `${path.parse(fileName).name}.md`);
      await fs.writeFile(summaryPath, summary);
      
      // Add document to graph
      await graph.addDocument(fileName, {
        created: new Date().toISOString(),
        type: 'text',
        summary: summary.substring(0, 200) // Store first 200 chars as preview
      });
      
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
      concepts = await extractConcepts(content);
      for (const concept of concepts) {
        // Add concept to graph
        await graph.addConcept(concept.slug, concept);
        
        // Link concept to document in graph
        await graph.linkConceptToDocument(concept.slug, fileName, concept.confidence);
        
        // Create concept markdown file
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
  
  // Mark as processed in cache
  await markProcessed(filePath, concepts, summary);
  
  // Update processed count
  const status = getProcessingStatus();
  updateProcessingStatus({
    processedFiles: (status.processedFiles || 0) + 1
  });
}

/**
 * Extract concepts from parsed code
 */
function extractCodeConcepts(parsed) {
  const concepts = [];
  const { symbols } = parsed;
  
  // Extract function concepts
  symbols.functions.forEach(fn => {
    concepts.push({
      name: fn.name,
      slug: fn.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      definition: `Function: ${fn.name}(${fn.params.join(', ')})`,
      importance: `Code function defined at line ${fn.line}`,
      source: 'EXTRACTED',
      confidence: 1.0
    });
  });
  
  // Extract class concepts
  symbols.classes.forEach(cls => {
    concepts.push({
      name: cls.name,
      slug: cls.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      definition: `Class: ${cls.name} with ${cls.methods.length} methods`,
      importance: `Code class defined at line ${cls.line}`,
      source: 'EXTRACTED',
      confidence: 1.0
    });
  });
  
  return concepts;
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
