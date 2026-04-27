import { SimpleGraphDB } from './simple-graph-db.js';

/**
 * Knowledge Graph wrapper for Knowledge Builder
 * Provides high-level operations for documents, concepts, and relationships
 */
export class KnowledgeGraph {
  constructor(dbPath = null) {
    this.db = new SimpleGraphDB(dbPath);
  }

  /**
   * Add a document to the graph
   */
  async addDocument(fileName, metadata = {}) {
    await this.db.addNode(fileName, 'document', {
      created: metadata.created || new Date().toISOString(),
      summary: metadata.summary || '',
      type: metadata.type || 'text'
    });
  }

  /**
   * Add a concept to the graph
   */
  async addConcept(conceptSlug, conceptData) {
    await this.db.addNode(conceptSlug, 'concept', {
      name: conceptData.name,
      definition: conceptData.definition,
      importance: conceptData.importance,
      source: conceptData.source || 'EXTRACTED',
      confidence: conceptData.confidence || 1.0
    });
  }

  /**
   * Link a concept to a document
   */
  async linkConceptToDocument(conceptSlug, documentName, confidence = 1.0) {
    await this.db.addEdge(conceptSlug, documentName, 'mentioned_in', { confidence });
    await this.db.addEdge(documentName, conceptSlug, 'contains_concept', { confidence });
  }

  /**
   * Add a code dependency
   */
  async addDependency(fromFile, toModule) {
    await this.db.addEdge(fromFile, toModule, 'depends_on', {});
  }

  /**
   * Get all concepts in a document
   */
  async getConceptsInDocument(documentName) {
    const edges = await this.db.getOutgoingEdges(documentName, 'contains_concept');
    return edges.map(e => e.to);
  }

  /**
   * Get all documents that mention a concept
   */
  async getDocumentsForConcept(conceptSlug) {
    const edges = await this.db.getOutgoingEdges(conceptSlug, 'mentioned_in');
    return edges.map(e => e.to);
  }

  /**
   * Get dependencies for a file
   */
  async getDependencies(fileName) {
    const edges = await this.db.getOutgoingEdges(fileName, 'depends_on');
    return edges.map(e => e.to);
  }

  /**
   * Find related concepts (concepts that appear in the same documents)
   */
  async findRelatedConcepts(conceptSlug, limit = 10) {
    // Get documents containing this concept
    const docs = await this.getDocumentsForConcept(conceptSlug);
    
    if (docs.length === 0) return [];
    
    // Get all concepts in those documents
    const relatedSet = new Set();
    
    for (const doc of docs) {
      const concepts = await this.getConceptsInDocument(doc);
      concepts.forEach(c => {
        if (c !== conceptSlug) {
          relatedSet.add(c);
        }
      });
    }
    
    return Array.from(relatedSet).slice(0, limit);
  }

  /**
   * Search concepts by pattern
   */
  async searchConcepts(pattern) {
    const results = await this.db.searchNodes('concept', pattern);
    return results.map(r => r.id);
  }

  /**
   * Get concept details
   */
  async getConcept(conceptSlug) {
    const node = await this.db.getNode(conceptSlug);
    if (!node) return null;
    
    return {
      slug: conceptSlug,
      ...node.properties
    };
  }

  /**
   * Get document details
   */
  async getDocument(fileName) {
    const node = await this.db.getNode(fileName);
    if (!node) return null;
    
    return {
      fileName,
      ...node.properties
    };
  }

  /**
   * Get all documents
   */
  async getAllDocuments() {
    const nodes = await this.db.getNodesByType('document');
    return nodes.map(n => ({
      fileName: n.id,
      ...n.properties
    }));
  }

  /**
   * Get all concepts
   */
  async getAllConcepts() {
    const nodes = await this.db.getNodesByType('concept');
    return nodes.map(n => ({
      slug: n.id,
      ...n.properties
    }));
  }

  /**
   * Get graph statistics
   */
  async getStats() {
    return await this.db.getStats();
  }

  /**
   * Export graph as JSON for visualization
   */
  async exportGraph() {
    const documents = await this.getAllDocuments();
    const concepts = await this.getAllConcepts();
    
    const nodes = [
      ...documents.map(d => ({ id: d.fileName, type: 'document', ...d })),
      ...concepts.map(c => ({ id: c.slug, type: 'concept', ...c }))
    ];
    
    const edges = [];
    
    // Get all edges
    for (const node of nodes) {
      const outgoing = await this.db.getOutgoingEdges(node.id);
      edges.push(...outgoing.map(e => ({
        source: e.from,
        target: e.to,
        type: e.type,
        ...e.properties
      })));
    }
    
    return { nodes, edges };
  }

  /**
   * Clear the entire graph
   */
  async clear() {
    await this.db.clear();
  }
}

// Singleton instance
let graphInstance = null;

/**
 * Get or create the knowledge graph instance
 */
export function getKnowledgeGraph(dbPath = null) {
  if (!graphInstance) {
    graphInstance = new KnowledgeGraph(dbPath);
  }
  return graphInstance;
}
