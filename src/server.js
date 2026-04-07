import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { getStats, listSummaries, listConcepts, getGraphData } from './api.js';
import { processRawFiles } from './process.js';
import { getProcessingStatus } from './status.js';
import { chatWithKnowledge } from './chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const rawDir = path.join(__dirname, '../raw');
    await fs.mkdir(rawDir, { recursive: true });
    cb(null, rawDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Routes

/**
 * GET /api/stats - Get knowledge base statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/summaries - List all summaries
 */
app.get('/api/summaries', async (req, res) => {
  try {
    const summaries = await listSummaries();
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/concepts - List all concepts
 */
app.get('/api/concepts', async (req, res) => {
  try {
    const concepts = await listConcepts();
    res.json(concepts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/graph - Get graph data for visualization
 */
app.get('/api/graph', async (req, res) => {
  try {
    const graphData = await getGraphData();
    res.json(graphData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/status - Get processing status
 */
app.get('/api/status', async (req, res) => {
  try {
    const status = getProcessingStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat - Chat with knowledge base
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const answer = await chatWithKnowledge(question);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fetch-url - Fetch content from URL using Jina Reader
 */
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Use Jina Reader API to convert URL to LLM-readable format
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaApiKey = process.env.JINA_API_KEY || 'jina_40f7558a35e0459a9b59596312f8b8b9wLVqtaGnOMTjhjpAU7nwSX9b_37S';
    const response = await fetch(jinaUrl, {
      headers: {
        'Authorization': `Bearer ${jinaApiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status}`);
    }
    
    const markdown = await response.text();
    
    // Save to raw directory
    const rawDir = path.join(__dirname, '../raw');
    const fileName = `${new URL(url).hostname.replace(/\./g, '-')}-${Date.now()}.md`;
    const filePath = path.join(rawDir, fileName);
    
    await fs.writeFile(filePath, `Source URL: ${url}\n\n${markdown}`);
    
    res.json({ 
      success: true, 
      fileName,
      message: 'URL content fetched and saved' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/upload - Upload files
 */
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      // Delete uploaded files
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(400).json({ 
        error: 'Files too large (max 10MB per file)',
        files: oversizedFiles.map(f => ({ name: f.originalname, size: f.size }))
      });
    }
    
    const fileList = files.map(f => ({
      name: f.originalname,
      size: f.size,
      path: f.path
    }));
    
    res.json({ 
      success: true, 
      files: fileList,
      message: `Uploaded ${files.length} file(s)` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/process - Process raw files
 */
app.post('/api/process', async (req, res) => {
  try {
    // Start processing in background
    processRawFiles().catch(console.error);
    
    res.json({ 
      success: true, 
      message: 'Processing started' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Knowledge Builder API running on http://localhost:${PORT}`);
});
