# Building a Knowledge Management System with AI-Powered Topic Grouping

## The Problem

Managing personal knowledge across multiple documents, URLs, and notes becomes chaotic as the collection grows. Traditional folder structures don't capture the interconnected nature of concepts, and manual categorization is time-consuming.

## The Solution: Knowledge Builder

A full-stack knowledge management system that:
- Automatically extracts concepts from documents
- Uses LLM to semantically group related concepts
- Visualizes knowledge as an interactive graph
- Enables natural language queries

## Tech Stack

**Backend:**
- Node.js + Express
- LLM: DeepSeek 3.2 via 9router
- File processing: PDF, DOCX, Markdown, TXT
- Content extraction: Jina Reader API

**Frontend:**
- Next.js 15.5.14
- D3.js for graph visualization
- Tailwind CSS
- React Markdown

**Infrastructure:**
- Systemd for process management
- Nginx reverse proxy
- Cloudflare Tunnel
- Vercel deployment

## Key Features

### 1. Automatic Concept Extraction
Upload documents and the system automatically:
- Generates summaries
- Extracts key concepts with confidence scores
- Identifies relationships between concepts

### 2. Semantic Topic Grouping
Instead of alphabetical sorting, uses LLM batch processing to:
- Analyze 139 concepts in 5 batches (30 concepts each)
- Generate 8 semantic topic categories
- Cache results for 24 hours

### 3. Knowledge Graph Visualization
Interactive D3.js graph showing:
- Concepts as nodes (color-coded by confidence)
- Relationships as edges
- Backlinks and connections

### 4. URL Content Extraction
Paste any URL and automatically:
- Extract content via Jina Reader
- Process and add to knowledge base
- Support for 17+ platforms (Twitter, Reddit, YouTube, etc.)

## Technical Challenges & Solutions

### Challenge 1: Cloudflare Blocking LLM Requests

**Problem:** 
- Initial setup used `https://9router.tomtom79.tech` (via Cloudflare Tunnel)
- All LLM requests returned 403 "Your request was blocked"
- Even small prompts were blocked

**Solution:**
- Changed baseURL from `https://9router.tomtom79.tech` to `http://localhost:20128`
- Direct localhost connection bypasses Cloudflare WAF
- LLM requests now work perfectly

### Challenge 2: Large Prompt Size

**Problem:**
- 139 concepts = ~10KB prompt
- Single LLM call would timeout or fail

**Solution:**
- Batch processing: Split into 5 batches of 30 concepts
- Process each batch sequentially with 1s delay
- Merge results and deduplicate topics
- Cache final result for 24 hours

### Challenge 3: Topics Page 404 on Vercel

**Problem:**
- Local build worked fine
- Vercel deployment returned 404 for `/topics`

**Solution:**
- Added `vercel.json` with proper build config
- Fixed Next.js routing configuration
- Ensured `.next` output directory was correct

### Challenge 4: Backend Port Conflicts

**Problem:**
- Multiple node processes fighting for port 3003
- Manual kill commands weren't reliable

**Solution:**
- Created systemd service for backend
- Auto-start on boot
- Proper process management with `systemctl`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js (Vercel) - https://knowledge-builder-nine.vercel.app│
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Tunnel                         │
│              https://kb-api.tomtom79.tech                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Nginx Proxy
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js)                          │
│                  localhost:3003                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  File Upload → Process → Extract Concepts            │   │
│  │       ↓                                               │   │
│  │  Topic Generation (Batch LLM)                        │   │
│  │       ↓                                               │   │
│  │  Cache Results (24h)                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ localhost
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    9router (LLM Proxy)                       │
│                  localhost:20128                             │
│              Model: kr/deepseek-3.2                          │
└─────────────────────────────────────────────────────────────┘
```

## Code Highlights

### Batch Processing LLM Topic Generation

```javascript
async function groupConceptsBatch(concepts) {
  const batches = [];
  for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
    batches.push(concepts.slice(i, i + BATCH_SIZE));
  }

  const allTopics = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const conceptList = batch.map(c => 
      `- ${c.name}: ${c.description || ''}`
    ).join('\n');
    
    const prompt = `Analyze these ${batch.length} concepts 
    and suggest 2-4 topic categories...`;

    const response = await callLLM(prompt, 'You are a knowledge expert.');
    const topics = JSON.parse(response.match(/\[[\s\S]*?\]/)[0]);
    allTopics.push(...topics);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return [...new Set(allTopics)];
}
```

### Systemd Service Configuration

```ini
[Unit]
Description=Knowledge Builder Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/knowledge-builder
Environment="OPENROUTER_API_KEY=sk-xxx"
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Results

**Before:**
- Manual categorization
- No semantic grouping
- Difficult to discover related concepts

**After:**
- 8 semantic topic categories
- 139 concepts automatically organized
- Interactive knowledge graph
- Natural language queries

**Performance:**
- Topic generation: ~15 seconds (5 batches)
- Cache hit: <10ms
- Frontend load: <2s

## Lessons Learned

1. **Always test localhost first** - Cloudflare/proxy issues can mask real problems
2. **Batch processing is essential** - Large LLM prompts are unreliable
3. **Caching saves money** - 24-hour cache reduces API calls by 99%
4. **Systemd > manual processes** - Proper service management prevents headaches
5. **Fallback strategies matter** - Alphabetical grouping as fallback ensures reliability

## Future Improvements

- [ ] Temporal knowledge tracking (time-based changes)
- [ ] Better relationship detection with confidence scoring
- [ ] Database backend (Neo4j/Memgraph) instead of file-based
- [ ] Cross-document analysis
- [ ] GraphRAG integration for agent memory
- [ ] Multimodal support (images, code, PDFs with vision)
- [ ] Community detection (Leiden clustering)

## Deployment

**Backend:**
```bash
# Install systemd service
sudo cp kb-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kb-backend
sudo systemctl start kb-backend
```

**Frontend:**
```bash
# Deploy to Vercel
git push origin main
# Auto-deploys via GitHub integration
```

## Conclusion

Building a knowledge management system taught me the importance of:
- Robust error handling and fallback strategies
- Understanding the full network path (localhost → proxy → tunnel)
- Batch processing for LLM reliability
- Proper infrastructure (systemd, nginx, caching)

The result is a production-ready system that automatically organizes knowledge using AI, making it easy to discover connections and insights.

**Live Demo:** https://knowledge-builder-nine.vercel.app

**GitHub:** https://github.com/duynguyendevit-ux/knowledge-builder

---

*Built with Next.js, Node.js, DeepSeek 3.2, and D3.js*
