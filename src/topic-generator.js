import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from './llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 30;
const CACHE_FILE = path.join(__dirname, '../cache/topics-cache.json');

/**
 * Group concepts in batches using LLM
 */
async function groupConceptsBatch(concepts) {
  const batches = [];
  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    batches.push(concepts.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Processing ${concepts.length} concepts in ${batches.length} batches...`);

  const allTopics = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} concepts)...`);
    
    const conceptList = batch.map(c => `- ${c.name}: ${c.description || ''}`).join('\n');
    
    const prompt = `Analyze these ${batch.length} concepts and suggest 2-4 topic categories they belong to.

Concepts:
${conceptList}

Return ONLY a JSON array of topic names, like: ["Topic 1", "Topic 2", "Topic 3"]`;

    try {
      const response = await callLLM(prompt, 'You are a knowledge organization expert.');
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const topics = JSON.parse(jsonMatch[0]);
        allTopics.push(...topics);
      }
    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed:`, error.message);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Deduplicate and merge similar topics
  const uniqueTopics = [...new Set(allTopics)];
  console.log(`✅ Found ${uniqueTopics.length} unique topics`);

  // Now assign concepts to topics
  return await assignConceptsToTopics(concepts, uniqueTopics);
}

/**
 * Assign concepts to topics
 */
async function assignConceptsToTopics(concepts, topicNames) {
  const topics = topicNames.map(name => ({
    name,
    summary: '',
    concepts: [],
    conceptDetails: []
  }));

  // Simple keyword matching for now
  for (const concept of concepts) {
    const text = `${concept.name} ${concept.description}`.toLowerCase();
    
    for (const topic of topics) {
      const keywords = topic.name.toLowerCase().split(/\s+/);
      if (keywords.some(kw => text.includes(kw))) {
        topic.concepts.push(concept.name);
        topic.conceptDetails.push(concept);
        break;
      }
    }
  }

  // Filter out empty topics and add summaries
  const validTopics = topics.filter(t => t.concepts.length > 0);
  
  for (const topic of validTopics) {
    topic.summary = `${topic.concepts.length} concepts related to ${topic.name}`;
  }

  return validTopics;
}

/**
 * Generate topics and cache result
 */
export async function generateAndCacheTopics(wikiDir) {
  try {
    console.log('🚀 Starting topic generation...');
    
    // Read all concepts
    const conceptsDir = path.join(wikiDir, 'concepts');
    const conceptFiles = await fs.readdir(conceptsDir);
    
    const concepts = [];
    for (const file of conceptFiles) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(conceptsDir, file), 'utf-8');
        
        const titleMatch = content.match(/title:\s*(.+)/);
        const definitionMatch = content.match(/## Definition\n(.+)/);
        
        const name = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
        const description = definitionMatch ? definitionMatch[1].trim() : '';
        
        concepts.push({ name, description, file });
      }
    }

    console.log(`📚 Found ${concepts.length} concepts`);

    // Group using batch processing
    const topics = await groupConceptsBatch(concepts);

    // Cache result
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify({
      timestamp: Date.now(),
      topics
    }, null, 2));

    console.log(`✅ Topics cached: ${topics.length} topics`);
    
    // Auto-generate articles for topics with 5+ concepts
    console.log('\n📝 Checking for article generation...');
    const { generateArticles } = await import('./article-generator.js');
    await generateArticles(topics, wikiDir);
    
    return topics;
  } catch (error) {
    console.error('❌ Topic generation failed:', error);
    return null;
  }
}

/**
 * Load cached topics
 */
export async function loadCachedTopics() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(data);
    
    // Cache valid for 24 hours
    const age = Date.now() - cache.timestamp;
    if (age < 24 * 60 * 60 * 1000) {
      console.log('📦 Using cached topics');
      return cache.topics;
    }
  } catch (error) {
    // No cache or invalid
  }
  
  return null;
}
