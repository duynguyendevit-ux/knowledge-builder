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
 * Load graph data
 */
async function loadGraph() {
  const wikiDir = path.join(__dirname, '..', config.paths.wiki);
  const summariesDir = path.join(wikiDir, 'summaries');
  const conceptsDir = path.join(wikiDir, 'concepts');

  const nodes = new Map();
  const edges = [];

  // Load concepts
  const conceptFiles = await fs.readdir(conceptsDir).catch(() => []);
  for (const file of conceptFiles) {
    const id = file.replace('.md', '');
    const filePath = path.join(conceptsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    const titleMatch = content.match(/title:\s*(.+)/);
    const sourceMatch = content.match(/source:\s*(.+)/);
    const confidenceMatch = content.match(/confidence:\s*([0-9.]+)/);

    nodes.set(id, {
      id,
      name: titleMatch ? titleMatch[1].replace(/['"]/g, '') : id,
      type: 'concept',
      source: sourceMatch ? sourceMatch[1].trim() : 'INFERRED',
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.8,
      content
    });

    // Extract edges
    const backlinksMatch = content.match(/## Mentioned In\n([\s\S]*?)(?=\n##|$)/);
    if (backlinksMatch) {
      const linkMatches = backlinksMatch[1].matchAll(/\[\[([^\]]+)\]\]\s*\(([^,]+),\s*confidence:\s*([0-9.]+)\)/g);
      for (const match of linkMatches) {
        edges.push({
          from: match[1],
          to: id,
          type: match[2].trim(),
          confidence: parseFloat(match[3])
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Find path between two nodes using BFS
 */
export async function findPath(startId, endId) {
  const { nodes, edges } = await loadGraph();

  if (!nodes.has(startId) || !nodes.has(endId)) {
    return { found: false, message: 'One or both nodes not found in graph' };
  }

  // Build adjacency list
  const adj = new Map();
  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from).push({ to: edge.to, ...edge });
  }

  // BFS
  const queue = [[startId]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === endId) {
      // Found path - build detailed response
      const pathDetails = [];
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const edge = edges.find(e => e.from === from && e.to === to);
        pathDetails.push({
          from: nodes.get(from).name,
          to: nodes.get(to).name,
          type: edge.type,
          confidence: edge.confidence
        });
      }
      return { found: true, path: pathDetails };
    }

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        queue.push([...path, neighbor.to]);
      }
    }
  }

  return { found: false, message: 'No path found between nodes' };
}

/**
 * Query graph with natural language
 */
export async function queryGraph(question, budget = 2000) {
  const { nodes, edges } = await loadGraph();

  // Build context from graph
  let context = '# Knowledge Graph\n\n## Concepts:\n';
  let tokenCount = 0;

  // Add high-confidence concepts first
  const sortedNodes = Array.from(nodes.values())
    .sort((a, b) => b.confidence - a.confidence);

  for (const node of sortedNodes) {
    const nodeText = `- ${node.name} (${node.source}, ${(node.confidence * 100).toFixed(0)}%)\n`;
    tokenCount += nodeText.length / 4; // rough token estimate
    if (tokenCount > budget * 0.7) break;
    context += nodeText;
  }

  context += '\n## Relationships:\n';
  for (const edge of edges.slice(0, 50)) {
    const edgeText = `- ${nodes.get(edge.from)?.name} → ${nodes.get(edge.to)?.name} (${edge.type}, ${(edge.confidence * 100).toFixed(0)}%)\n`;
    tokenCount += edgeText.length / 4;
    if (tokenCount > budget) break;
    context += edgeText;
  }

  const systemPrompt = 'You are a knowledge graph query assistant. Answer questions based on the graph structure provided.';
  const prompt = `${context}\n\nQuestion: ${question}\n\nAnswer based on the graph above. Cite specific nodes and relationships.`;

  const answer = await callLLM(prompt, systemPrompt);
  return answer;
}

/**
 * Explain a concept in detail
 */
export async function explainConcept(conceptId) {
  const { nodes, edges } = await loadGraph();

  const node = nodes.get(conceptId);
  if (!node) {
    return { found: false, message: 'Concept not found' };
  }

  // Find all connections
  const incoming = edges.filter(e => e.to === conceptId);
  const outgoing = edges.filter(e => e.from === conceptId);

  return {
    found: true,
    concept: {
      name: node.name,
      source: node.source,
      confidence: node.confidence,
      content: node.content
    },
    connections: {
      incoming: incoming.map(e => ({
        from: nodes.get(e.from)?.name,
        type: e.type,
        confidence: e.confidence
      })),
      outgoing: outgoing.map(e => ({
        to: nodes.get(e.to)?.name,
        type: e.type,
        confidence: e.confidence
      }))
    }
  };
}
