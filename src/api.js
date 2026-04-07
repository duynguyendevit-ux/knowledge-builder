import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

/**
 * Get statistics about the knowledge base
 */
export async function getStats() {
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);
  const rawDir = path.join(__dirname, '..', config.paths.raw);

  const stats = {
    totalFiles: 0,
    summaries: 0,
    concepts: 0,
    connections: 0,
  };

  try {
    // Count raw files
    const rawFiles = await getAllFiles(rawDir);
    stats.totalFiles = rawFiles.length;

    // Count summaries
    const summariesDir = path.join(wikiDir, 'summaries');
    const summaries = await fs.readdir(summariesDir).catch(() => []);
    stats.summaries = summaries.length;

    // Count concepts
    const conceptsDir = path.join(wikiDir, 'concepts');
    const concepts = await fs.readdir(conceptsDir).catch(() => []);
    stats.concepts = concepts.length;

    // Count connections
    const connectionsDir = path.join(wikiDir, 'connections');
    const connections = await fs.readdir(connectionsDir).catch(() => []);
    stats.connections = connections.length;
  } catch (error) {
    console.error('Error getting stats:', error);
  }

  return stats;
}

/**
 * Get all files recursively
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
    // Directory doesn't exist
  }
  
  return files;
}

/**
 * List all summaries
 */
export async function listSummaries() {
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);
  const summariesDir = path.join(wikiDir, 'summaries');
  
  try {
    const files = await fs.readdir(summariesDir);
    const summaries = [];
    
    for (const file of files) {
      const filePath = path.join(summariesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract title from frontmatter or filename
      const titleMatch = content.match(/title:\s*(.+)/);
      const title = titleMatch ? titleMatch[1].replace(/['"]/g, '') : file;
      
      summaries.push({
        id: file.replace('.md', ''),
        title,
        file,
      });
    }
    
    return summaries;
  } catch (error) {
    return [];
  }
}

/**
 * List all concepts
 */
export async function listConcepts() {
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);
  const conceptsDir = path.join(wikiDir, 'concepts');
  
  try {
    const files = await fs.readdir(conceptsDir);
    const concepts = [];
    
    for (const file of files) {
      const filePath = path.join(conceptsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract title from frontmatter
      const titleMatch = content.match(/title:\s*(.+)/);
      const title = titleMatch ? titleMatch[1].replace(/['"]/g, '') : file;
      
      // Count backlinks
      const backlinksMatch = content.match(/## Mentioned In\n([\s\S]*?)(?=\n##|$)/);
      const backlinks = backlinksMatch ? (backlinksMatch[1].match(/\[\[/g) || []).length : 0;
      
      concepts.push({
        id: file.replace('.md', ''),
        title,
        file,
        backlinks,
      });
    }
    
    return concepts.sort((a, b) => b.backlinks - a.backlinks);
  } catch (error) {
    return [];
  }
}

/**
 * Get graph data for visualization
 */
export async function getGraphData() {
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);
  const summariesDir = path.join(wikiDir, 'summaries');
  const conceptsDir = path.join(wikiDir, 'concepts');

  const nodes = [];
  const links = [];

  try {
    // Get summaries as nodes
    const summaryFiles = await fs.readdir(summariesDir).catch(() => []);
    for (const file of summaryFiles) {
      const id = file.replace('.md', '');
      nodes.push({
        id,
        name: id.replace(/-/g, ' '),
        type: 'summary'
      });
    }

    // Get concepts as nodes and extract links
    const conceptFiles = await fs.readdir(conceptsDir).catch(() => []);
    for (const file of conceptFiles) {
      const id = file.replace('.md', '');
      const filePath = path.join(conceptsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract title and metadata from frontmatter
      const titleMatch = content.match(/title:\s*(.+)/);
      const sourceMatch = content.match(/source:\s*(.+)/);
      const confidenceMatch = content.match(/confidence:\s*([0-9.]+)/);
      
      const title = titleMatch ? titleMatch[1].replace(/['"]/g, '') : file;
      const source = sourceMatch ? sourceMatch[1].trim() : 'INFERRED';
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8;

      // Count backlinks
      const backlinksMatch = content.match(/## Mentioned In\n([\s\S]*?)(?=\n##|$)/);
      const backlinks = backlinksMatch ? (backlinksMatch[1].match(/\[\[/g) || []).length : 0;

      nodes.push({
        id,
        name: title,
        type: 'concept',
        backlinks,
        source,
        confidence
      });

      // Extract links from backlinks with confidence scores
      if (backlinksMatch) {
        const linkMatches = backlinksMatch[1].matchAll(/\[\[([^\]]+)\]\]\s*\(([^,]+),\s*confidence:\s*([0-9.]+)\)/g);
        for (const match of linkMatches) {
          const targetId = match[1];
          const linkSource = match[2].trim();
          const linkConfidence = parseFloat(match[3]);
          links.push({
            source: targetId,
            target: id,
            type: linkSource,
            confidence: linkConfidence
          });
        }
      }
    }

    return { nodes, links };
  } catch (error) {
    console.error('Error getting graph data:', error);
    return { nodes: [], links: [] };
  }
}
