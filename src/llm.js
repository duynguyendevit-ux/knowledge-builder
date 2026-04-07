import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

// Override with environment variables
if (process.env.OPENROUTER_API_KEY) {
  config.llm.apiKey = process.env.OPENROUTER_API_KEY;
}
if (process.env.LLM_MODEL) {
  config.llm.model = process.env.LLM_MODEL;
}
if (process.env.LLM_BASE_URL) {
  config.llm.baseUrl = process.env.LLM_BASE_URL;
}

// Initialize OpenRouter client
const apiKey = process.env.OPENROUTER_API_KEY || config.llm.apiKey;
console.log('🔑 API Key loaded:', apiKey ? `${apiKey.substring(0, 15)}...` : 'MISSING');
const openrouter = new OpenAI({
  baseURL: config.llm.baseUrl || 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/duynguyendevit-ux/knowledge-builder',
    'X-Title': 'Knowledge Builder',
  }
});

/**
 * Call LLM with a prompt
 */
export async function callLLM(prompt, systemPrompt = null) {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await openrouter.chat.completions.create({
      model: config.llm.model || 'anthropic/claude-3.5-sonnet',
      messages: messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('❌ LLM API Error:', error.message);
    throw error;
  }
}

/**
 * Generate summary for a document
 */
export async function generateSummary(fileName, content) {
  const systemPrompt = `You are a knowledge management assistant. Create structured summaries in Obsidian-compatible markdown format.`;
  
  const prompt = `Read this document and create a structured summary with:
- Title and metadata (YAML frontmatter)
- 3-5 sentence summary
- Key points (bullet list, 5-7 points)
- Main concepts (extract 3-7 key concepts)
- Related topics
- Backlinks to other documents (use [[concept-name]] format)

Document: ${fileName}

Content:
${content.substring(0, 8000)}

Format as markdown with YAML frontmatter. Use Obsidian wikilink format [[concept]] for concepts.`;

  const summary = await callLLM(prompt, systemPrompt);
  return summary;
}

/**
 * Extract concepts from content
 */
export async function extractConcepts(content) {
  const systemPrompt = `You are a concept extraction specialist. Extract key concepts from documents.`;
  
  const prompt = `From this document, extract key concepts.
For each concept:
- Name (short, 2-3 words)
- Brief definition (1 sentence)
- Importance (why it matters)

Return as JSON array:
[
  {
    "name": "concept-name",
    "slug": "concept-name",
    "definition": "Brief definition",
    "importance": "Why it matters"
  }
]

Content:
${content.substring(0, 8000)}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await callLLM(prompt, systemPrompt);
    // Try to parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('⚠️  Failed to extract concepts:', error.message);
    return [];
  }
}

/**
 * Find connections between documents
 */
export async function findConnections(newContent, existingDocs) {
  if (existingDocs.length === 0) return [];
  
  const systemPrompt = `You are a connection discovery specialist. Find relationships between documents.`;
  
  const prompt = `Given this new document and existing documents, find interesting connections.

New document:
${newContent.substring(0, 4000)}

Existing documents:
${existingDocs.slice(0, 5).map(doc => `- ${doc.title}: ${doc.summary}`).join('\n')}

Find:
- Shared concepts
- Complementary ideas
- Contradictions
- Related topics

Return as JSON array:
[
  {
    "type": "shared-concept|complementary|contradiction|related",
    "description": "Brief description of connection",
    "documents": ["doc1", "doc2"]
  }
]

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await callLLM(prompt, systemPrompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('⚠️  Failed to find connections:', error.message);
    return [];
  }
}
