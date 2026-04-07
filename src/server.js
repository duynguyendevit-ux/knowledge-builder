import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { getStats, listSummaries, listConcepts, getGraphData } from './api.js';
import { processRawFiles } from './process.js';

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
 * POST /api/upload - Upload files
 */
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files.map(f => ({
      name: f.originalname,
      size: f.size,
      path: f.path
    }));
    
    res.json({ 
      success: true, 
      files,
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
