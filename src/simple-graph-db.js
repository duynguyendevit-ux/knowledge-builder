import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple in-memory graph database with JSON persistence
 * Stores nodes (documents, concepts) and edges (relationships)
 */
export class SimpleGraphDB {
  constructor(dbPath = null) {
    const defaultPath = path.join(__dirname, '../.graph-db.json');
    this.dbPath = dbPath || defaultPath;
    
    this.nodes = new Map(); // id -> { type, properties }
    this.edges = new Map(); // id -> { from, to, type, properties }
    this.indexes = {
      byType: new Map(),      // type -> Set(nodeIds)
      byPredicate: new Map(), // predicate -> Set(edgeIds)
      outgoing: new Map(),    // nodeId -> Set(edgeIds)
      incoming: new Map()     // nodeId -> Set(edgeIds)
    };
    
    this.loaded = false;
  }

  /**
   * Load database from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Restore nodes
      this.nodes = new Map(parsed.nodes);
      
      // Restore edges
      this.edges = new Map(parsed.edges);
      
      // Rebuild indexes
      this._rebuildIndexes();
      
      this.loaded = true;
    } catch (error) {
      // File doesn't exist yet, start fresh
      this.loaded = true;
    }
  }

  /**
   * Save database to disk
   */
  async save() {
    const data = {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries())
    };
    
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2));
  }

  /**
   * Rebuild indexes from nodes and edges
   */
  _rebuildIndexes() {
    this.indexes.byType.clear();
    this.indexes.byPredicate.clear();
    this.indexes.outgoing.clear();
    this.indexes.incoming.clear();
    
    // Index nodes by type
    for (const [id, node] of this.nodes) {
      if (!this.indexes.byType.has(node.type)) {
        this.indexes.byType.set(node.type, new Set());
      }
      this.indexes.byType.get(node.type).add(id);
    }
    
    // Index edges
    for (const [id, edge] of this.edges) {
      // By predicate
      if (!this.indexes.byPredicate.has(edge.type)) {
        this.indexes.byPredicate.set(edge.type, new Set());
      }
      this.indexes.byPredicate.get(edge.type).add(id);
      
      // Outgoing edges
      if (!this.indexes.outgoing.has(edge.from)) {
        this.indexes.outgoing.set(edge.from, new Set());
      }
      this.indexes.outgoing.get(edge.from).add(id);
      
      // Incoming edges
      if (!this.indexes.incoming.has(edge.to)) {
        this.indexes.incoming.set(edge.to, new Set());
      }
      this.indexes.incoming.get(edge.to).add(id);
    }
  }

  /**
   * Add a node
   */
  async addNode(id, type, properties = {}) {
    if (!this.loaded) await this.load();
    
    this.nodes.set(id, { type, properties });
    
    // Update index
    if (!this.indexes.byType.has(type)) {
      this.indexes.byType.set(type, new Set());
    }
    this.indexes.byType.get(type).add(id);
    
    await this.save();
  }

  /**
   * Add an edge
   */
  async addEdge(from, to, type, properties = {}) {
    if (!this.loaded) await this.load();
    
    const edgeId = `${from}->${type}->${to}`;
    this.edges.set(edgeId, { from, to, type, properties });
    
    // Update indexes
    if (!this.indexes.byPredicate.has(type)) {
      this.indexes.byPredicate.set(type, new Set());
    }
    this.indexes.byPredicate.get(type).add(edgeId);
    
    if (!this.indexes.outgoing.has(from)) {
      this.indexes.outgoing.set(from, new Set());
    }
    this.indexes.outgoing.get(from).add(edgeId);
    
    if (!this.indexes.incoming.has(to)) {
      this.indexes.incoming.set(to, new Set());
    }
    this.indexes.incoming.get(to).add(edgeId);
    
    await this.save();
  }

  /**
   * Get a node by id
   */
  async getNode(id) {
    if (!this.loaded) await this.load();
    return this.nodes.get(id);
  }

  /**
   * Get all nodes of a type
   */
  async getNodesByType(type) {
    if (!this.loaded) await this.load();
    
    const nodeIds = this.indexes.byType.get(type) || new Set();
    return Array.from(nodeIds).map(id => ({
      id,
      ...this.nodes.get(id)
    }));
  }

  /**
   * Get outgoing edges from a node
   */
  async getOutgoingEdges(nodeId, edgeType = null) {
    if (!this.loaded) await this.load();
    
    const edgeIds = this.indexes.outgoing.get(nodeId) || new Set();
    let edges = Array.from(edgeIds).map(id => ({
      id,
      ...this.edges.get(id)
    }));
    
    if (edgeType) {
      edges = edges.filter(e => e.type === edgeType);
    }
    
    return edges;
  }

  /**
   * Get incoming edges to a node
   */
  async getIncomingEdges(nodeId, edgeType = null) {
    if (!this.loaded) await this.load();
    
    const edgeIds = this.indexes.incoming.get(nodeId) || new Set();
    let edges = Array.from(edgeIds).map(id => ({
      id,
      ...this.edges.get(id)
    }));
    
    if (edgeType) {
      edges = edges.filter(e => e.type === edgeType);
    }
    
    return edges;
  }

  /**
   * Find nodes by property
   */
  async findNodes(type, propertyKey, propertyValue) {
    if (!this.loaded) await this.load();
    
    const nodes = await this.getNodesByType(type);
    return nodes.filter(node => 
      node.properties[propertyKey] === propertyValue
    );
  }

  /**
   * Search nodes by pattern
   */
  async searchNodes(type, pattern) {
    if (!this.loaded) await this.load();
    
    const nodes = await this.getNodesByType(type);
    const lowerPattern = pattern.toLowerCase();
    
    return nodes.filter(node => 
      node.id.toLowerCase().includes(lowerPattern) ||
      Object.values(node.properties).some(val => 
        String(val).toLowerCase().includes(lowerPattern)
      )
    );
  }

  /**
   * Get graph statistics
   */
  async getStats() {
    if (!this.loaded) await this.load();
    
    const stats = {
      nodes: this.nodes.size,
      edges: this.edges.size,
      nodesByType: {},
      edgesByType: {}
    };
    
    // Count nodes by type
    for (const [type, nodeIds] of this.indexes.byType) {
      stats.nodesByType[type] = nodeIds.size;
    }
    
    // Count edges by type
    for (const [type, edgeIds] of this.indexes.byPredicate) {
      stats.edgesByType[type] = edgeIds.size;
    }
    
    return stats;
  }

  /**
   * Clear all data
   */
  async clear() {
    this.nodes.clear();
    this.edges.clear();
    this._rebuildIndexes();
    await this.save();
  }
}

// Singleton instance
let dbInstance = null;

/**
 * Get or create the graph database instance
 */
export function getGraphDB(dbPath = null) {
  if (!dbInstance) {
    dbInstance = new SimpleGraphDB(dbPath);
  }
  return dbInstance;
}
