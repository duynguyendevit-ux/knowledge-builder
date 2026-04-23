import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from './llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIN_CONCEPTS = 5; // Minimum concepts to generate article

/**
 * Generate article from topic
 */
async function generateArticleFromTopic(topic, wikiDir) {
  console.log(`📝 Generating article for topic: ${topic.name}`);
  
  // Read full concept details
  const conceptsDir = path.join(wikiDir, 'concepts');
  const conceptDetails = [];
  
  for (const concept of topic.conceptDetails) {
    try {
      const filePath = path.join(conceptsDir, concept.file);
      const content = await fs.readFile(filePath, 'utf-8');
      conceptDetails.push({
        name: concept.name,
        content: content
      });
    } catch (error) {
      console.error(`Failed to read concept: ${concept.file}`);
    }
  }
  
  // Build context for LLM
  const conceptSummaries = conceptDetails.map(c => {
    const defMatch = c.content.match(/## Definition\n(.+)/);
    const impMatch = c.content.match(/## Importance\n(.+)/);
    return `**${c.name}**
Definition: ${defMatch ? defMatch[1] : 'N/A'}
Importance: ${impMatch ? impMatch[1] : 'N/A'}`;
  }).join('\n\n');
  
  const prompt = `Write a comprehensive article about "${topic.name}" based on these ${conceptDetails.length} concepts:

${conceptSummaries}

Structure the article as:
1. Introduction (2-3 paragraphs explaining the topic)
2. Key Concepts (detailed sections for main concepts)
3. How They Connect (relationships and patterns)
4. Practical Applications (real-world use cases)
5. Conclusion (summary and future outlook)

Write in a clear, engaging style. Use markdown formatting. Include concept names as references.

Return ONLY the article content in markdown format.`;

  const systemPrompt = 'You are a technical writer who creates comprehensive, well-structured articles from knowledge bases.';
  
  try {
    const article = await callLLM(prompt, systemPrompt);
    return article;
  } catch (error) {
    console.error(`Failed to generate article: ${error.message}`);
    return null;
  }
}

/**
 * Save article to file
 */
async function saveArticle(topic, article, wikiDir) {
  const articlesDir = path.join(wikiDir, 'articles');
  await fs.mkdir(articlesDir, { recursive: true });
  
  const filename = topic.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
  
  const filePath = path.join(articlesDir, filename);
  
  // Add frontmatter
  const frontmatter = `---
title: ${topic.name}
generated: ${new Date().toISOString()}
concepts: ${topic.concepts.length}
---

`;
  
  // Add references section
  const references = `

---

## References

${topic.conceptDetails.map(c => `- **${c.name}** (${c.confidence || 'EXTRACTED'})`).join('\n')}

*This article was automatically generated from ${topic.concepts.length} concepts in the knowledge base.*
`;
  
  const fullContent = frontmatter + article + references;
  
  await fs.writeFile(filePath, fullContent, 'utf-8');
  console.log(`✅ Article saved: ${filename}`);
  
  return filename;
}

/**
 * Generate articles for all eligible topics
 */
export async function generateArticles(topics, wikiDir) {
  console.log('📚 Starting article generation...');
  
  const eligibleTopics = topics.filter(t => t.concepts.length >= MIN_CONCEPTS);
  console.log(`Found ${eligibleTopics.length} topics with ${MIN_CONCEPTS}+ concepts`);
  
  const generatedArticles = [];
  
  for (let i = 0; i < eligibleTopics.length; i++) {
    const topic = eligibleTopics[i];
    console.log(`\n[${i + 1}/${eligibleTopics.length}] Processing: ${topic.name} (${topic.concepts.length} concepts)`);
    
    try {
      const article = await generateArticleFromTopic(topic, wikiDir);
      
      if (article) {
        const filename = await saveArticle(topic, article, wikiDir);
        generatedArticles.push({
          topic: topic.name,
          filename,
          concepts: topic.concepts.length
        });
      }
      
      // Delay between articles to avoid rate limits
      if (i < eligibleTopics.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to generate article for ${topic.name}:`, error.message);
    }
  }
  
  console.log(`\n✅ Article generation complete: ${generatedArticles.length} articles created`);
  return generatedArticles;
}

/**
 * Get list of generated articles
 */
export async function listArticles(wikiDir) {
  const articlesDir = path.join(wikiDir, 'articles');
  
  try {
    const files = await fs.readdir(articlesDir);
    const articles = [];
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');
        const titleMatch = content.match(/title:\s*(.+)/);
        const conceptsMatch = content.match(/concepts:\s*(\d+)/);
        const generatedMatch = content.match(/generated:\s*(.+)/);
        
        articles.push({
          filename: file,
          title: titleMatch ? titleMatch[1] : file,
          concepts: conceptsMatch ? parseInt(conceptsMatch[1]) : 0,
          generated: generatedMatch ? generatedMatch[1] : null
        });
      }
    }
    
    return articles;
  } catch (error) {
    return [];
  }
}
