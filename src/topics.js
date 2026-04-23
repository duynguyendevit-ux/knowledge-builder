import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from './llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Group concepts by topics using LLM
 */
export async function groupConceptsByTopics(concepts) {
  if (!concepts || concepts.length === 0) {
    return [];
  }

  const conceptList = concepts.map(c => `- ${c.name}: ${c.description || ''}`).join('\n');
  
  const prompt = `Analyze these concepts and group them into 3-7 main topics.

Concepts:
${conceptList}

For each topic:
1. Give it a clear, descriptive name
2. List which concepts belong to it
3. Write a 2-3 sentence summary of what this topic covers

Format as JSON:
[
  {
    "name": "Topic Name",
    "summary": "Brief description of this topic area",
    "concepts": ["concept1", "concept2", ...]
  }
]

Return ONLY the JSON array, no other text.`;

  const systemPrompt = 'You are an expert at organizing knowledge into coherent topics. Group related concepts together logically.';

  try {
    const response = await callLLM(prompt, systemPrompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Failed to parse topics from LLM response');
      return [];
    }
    
    const topics = JSON.parse(jsonMatch[0]);
    
    // Add concept details to each topic
    return topics.map(topic => ({
      ...topic,
      conceptDetails: topic.concepts.map(conceptName => 
        concepts.find(c => c.name.toLowerCase() === conceptName.toLowerCase())
      ).filter(Boolean)
    }));
  } catch (error) {
    console.error('Failed to group concepts by topics:', error);
    return [];
  }
}

/**
 * Get all topics with their concepts
 */
export async function getAllTopics(wikiDir) {
  try {
    // Read all concepts
    const conceptsDir = path.join(wikiDir, 'concepts');
    const conceptFiles = await fs.readdir(conceptsDir);
    
    const concepts = [];
    for (const file of conceptFiles) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(conceptsDir, file), 'utf-8');
        
        // Parse markdown frontmatter and content
        const titleMatch = content.match(/title:\s*(.+)/);
        const definitionMatch = content.match(/## Definition\n(.+)/);
        const confidenceMatch = content.match(/confidence:\s*([0-9.]+)/);
        
        const name = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
        const description = definitionMatch ? definitionMatch[1].trim() : '';
        const confidence = confidenceMatch ? confidenceMatch[1] : 'EXTRACTED';
        
        concepts.push({
          name,
          description,
          confidence,
          file
        });
      }
    }
    
    // Simple grouping by first letter (fallback when LLM fails)
    const grouped = {};
    for (const concept of concepts) {
      const firstLetter = concept.name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(concept);
    }
    
    // Convert to topics format
    const topics = Object.entries(grouped).map(([letter, concepts]) => ({
      name: `${letter} - ${concepts.length} concepts`,
      summary: `Concepts starting with ${letter}`,
      concepts: concepts.map(c => c.name),
      conceptDetails: concepts
    }));
    
    return topics.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Failed to get topics:', error);
    return [];
  }
}
