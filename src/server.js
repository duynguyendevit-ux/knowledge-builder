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
import { findPath, queryGraph, explainConcept } from './query.js';
import { hashPassword, verifyPassword, generateToken, createSession, verifySession, removeSession } from './auth.js';
import { getAllTopics } from './topics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Password from environment variable (default for demo)
const PASSWORD_HASH = process.env.KB_PASSWORD_HASH || hashPassword('admin123');

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !verifySession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

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
 * POST /api/login - Login with password
 */
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (!verifyPassword(password, PASSWORD_HASH)) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = generateToken();
    createSession(token);
    
    res.json({ token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/logout - Logout
 */
app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    removeSession(token);
  }
  res.json({ message: 'Logged out' });
});

/**
 * GET /api/stats - Get knowledge base statistics
 */
app.get('/api/stats', requireAuth, async (req, res) => {
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
app.get('/api/summaries', requireAuth, async (req, res) => {
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
app.get('/api/concepts', requireAuth, async (req, res) => {
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
app.get('/api/graph', requireAuth, async (req, res) => {
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
app.get('/api/status', requireAuth, async (req, res) => {
  try {
    const status = getProcessingStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/topics - Get all topics with grouped concepts
 */
app.get('/api/topics', requireAuth, async (req, res) => {
  try {
    const wikiDir = path.join(__dirname, '..', 'wiki');
    const topics = await getAllTopics(wikiDir);
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat - Chat with knowledge base
 */
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Check for query commands
    if (question.startsWith('/query ')) {
      const query = question.substring(7).trim();
      const answer = await queryGraph(query);
      return res.json({ answer, type: 'query' });
    }
    
    if (question.startsWith('/path ')) {
      const parts = question.substring(6).split(' ');
      if (parts.length < 2) {
        return res.json({ answer: 'Usage: /path "NodeA" "NodeB"', type: 'error' });
      }
      const startId = parts[0].replace(/"/g, '').toLowerCase().replace(/\s+/g, '-');
      const endId = parts[1].replace(/"/g, '').toLowerCase().replace(/\s+/g, '-');
      const result = await findPath(startId, endId);
      
      if (!result.found) {
        return res.json({ answer: result.message, type: 'path' });
      }
      
      let answer = `Path found (${result.path.length} steps):\n\n`;
      for (const step of result.path) {
        answer += `${step.from} → ${step.to}\n`;
        answer += `  Type: ${step.type}, Confidence: ${(step.confidence * 100).toFixed(0)}%\n\n`;
      }
      return res.json({ answer, type: 'path' });
    }
    
    if (question.startsWith('/explain ')) {
      const conceptId = question.substring(9).trim().toLowerCase().replace(/\s+/g, '-');
      const result = await explainConcept(conceptId);
      
      if (!result.found) {
        return res.json({ answer: result.message, type: 'error' });
      }
      
      let answer = `# ${result.concept.name}\n\n`;
      answer += `**Source:** ${result.concept.source} | **Confidence:** ${(result.concept.confidence * 100).toFixed(0)}%\n\n`;
      
      // Extract definition from content
      const defMatch = result.concept.content.match(/## Definition\n([^#]+)/);
      if (defMatch) {
        answer += `**Definition:**\n${defMatch[1].trim()}\n\n`;
      }
      
      if (result.connections.incoming.length > 0) {
        answer += `**Incoming connections (${result.connections.incoming.length}):**\n`;
        for (const conn of result.connections.incoming.slice(0, 5)) {
          answer += `- ${conn.from} (${conn.type}, ${(conn.confidence * 100).toFixed(0)}%)\n`;
        }
        answer += '\n';
      }
      
      if (result.connections.outgoing.length > 0) {
        answer += `**Outgoing connections (${result.connections.outgoing.length}):**\n`;
        for (const conn of result.connections.outgoing.slice(0, 5)) {
          answer += `- ${conn.to} (${conn.type}, ${(conn.confidence * 100).toFixed(0)}%)\n`;
        }
      }
      
      return res.json({ answer, type: 'explain' });
    }
    
    // Default chat
    const answer = await chatWithKnowledge(question);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fetch-url - Fetch content from URL using Jina Reader
 */
app.post('/api/fetch-url', requireAuth, async (req, res) => {
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
app.post('/api/upload', requireAuth, upload.array('files'), async (req, res) => {
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
    
    // Validate file types
    const allowedTypes = ['.md', '.txt', '.docx', '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const invalidFiles = files.filter(f => {
      const ext = path.extname(f.originalname).toLowerCase();
      return !allowedTypes.includes(ext);
    });
    
    if (invalidFiles.length > 0) {
      // Delete uploaded files
      for (const file of files) {
        await fs.unlink(file.path).catch(() => {});
      }
      return res.status(400).json({ 
        error: 'Invalid file types',
        files: invalidFiles.map(f => ({ name: f.originalname })),
        allowed: allowedTypes
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
app.post('/api/process', requireAuth, async (req, res) => {
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
