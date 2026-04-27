// Query and visualize the knowledge graph
import { getKnowledgeGraph } from './knowledge-graph.js';

async function queryGraph() {
  console.log('🔍 Querying Knowledge Graph...\n');
  
  const graph = getKnowledgeGraph();
  
  try {
    // Get statistics
    console.log('📊 Graph Statistics:');
    const stats = await graph.getStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log();

    // Get all documents
    console.log('📄 Documents:');
    const docs = await graph.getAllDocuments();
    docs.forEach(doc => {
      console.log(`  - ${doc.fileName} (${doc.type})`);
    });
    console.log();

    // Get all concepts
    console.log('🧠 Concepts:');
    const concepts = await graph.getAllConcepts();
    concepts.forEach(concept => {
      console.log(`  - ${concept.name} (${concept.source}, confidence: ${concept.confidence})`);
    });
    console.log();

    // Query specific document
    console.log('🔎 Concepts in "intro-to-ml.md":');
    const mlConcepts = await graph.getConceptsInDocument('intro-to-ml.md');
    console.log(`  Found ${mlConcepts.length} concepts:`, mlConcepts);
    console.log();

    // Query specific concept
    console.log('📚 Documents mentioning "machine-learning":');
    const mlDocs = await graph.getDocumentsForConcept('machine-learning');
    console.log(`  Found in ${mlDocs.length} documents:`, mlDocs);
    console.log();

    // Find related concepts
    console.log('🌐 Related concepts to "machine-learning":');
    const related = await graph.findRelatedConcepts('machine-learning', 5);
    console.log(`  Related:`, related);
    console.log();

    // Get dependencies
    console.log('📦 Dependencies for "example-server.js":');
    const deps = await graph.getDependencies('example-server.js');
    console.log(`  Dependencies:`, deps);
    console.log();

    // Search concepts
    console.log('🔍 Search concepts with "learning":');
    const searchResults = await graph.searchConcepts('learning');
    console.log(`  Results:`, searchResults);
    console.log();

    // Export full graph
    console.log('📤 Exporting full graph...');
    const exported = await graph.exportGraph();
    console.log(`  Nodes: ${exported.nodes.length}`);
    console.log(`  Edges: ${exported.edges.length}`);
    console.log();

    console.log('✅ Query complete!');
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error(error.stack);
  }
}

queryGraph();
