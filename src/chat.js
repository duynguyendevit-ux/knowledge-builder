import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from './llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

/**
 * Chat with knowledge base
 */
export async function chatWithKnowledge(question) {
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);
  
  // Load all summaries and concepts
  const context = await buildContext(wikiDir);
  
  const systemPrompt = `You are a helpful assistant with access to a knowledge base. 
Answer questions based on the provided context. If the answer is not in the context, say so.
Be concise and cite sources when possible.`;

  const prompt = `Context from knowledge base:

${context}

Question: ${question}

Answer based on the context above:`;

  const answer = await callLLM(prompt, systemPrompt);
  return answer;
}

/**
 * Build context from knowledge base
 */
async function buildContext(wikiDir) {
  const summariesDir = path.join(wikiDir, 'summaries');
  const conceptsDir = path.join(wikiDir, 'concepts');
  
  let context = '';
  
  try {
    // Add summaries
    const summaryFiles = await fs.readdir(summariesDir).catch(() => []);
    for (const file of summaryFiles.slice(0, 5)) { // Limit to 5 most recent
      const content = await fs.readFile(path.join(summariesDir, file), 'utf-8');
      const summary = content.substring(0, 1000); // First 1000 chars
      context += `\n\n## ${file}\n${summary}`;
    }
    
    // Add top concepts
    const conceptFiles = await fs.readdir(conceptsDir).catch(() => []);
    context += '\n\n## Key Concepts:\n';
    for (const file of conceptFiles.slice(0, 10)) { // Top 10 concepts
      const content = await fs.readFile(path.join(conceptsDir, file), 'utf-8');
      const titleMatch = content.match(/# (.+)/);
      const defMatch = content.match(/## Definition\n(.+)/);
      if (titleMatch && defMatch) {
        context += `- ${titleMatch[1]}: ${defMatch[1]}\n`;
      }
    }
  } catch (error) {
    console.error('Error building context:', error);
  }
  
  return context;
}
