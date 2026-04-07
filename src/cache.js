import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculate SHA256 hash of file
 */
export async function getFileHash(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Load cache index
 */
export async function loadCacheIndex() {
  const cacheDir = path.join(__dirname, '../cache');
  const indexPath = path.join(cacheDir, 'index.json');
  
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

/**
 * Save cache index
 */
export async function saveCacheIndex(index) {
  const cacheDir = path.join(__dirname, '../cache');
  const indexPath = path.join(cacheDir, 'index.json');
  
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Check if file needs processing
 */
export async function needsProcessing(filePath) {
  const cacheIndex = await loadCacheIndex();
  const currentHash = await getFileHash(filePath);
  const fileName = path.basename(filePath);
  
  const cached = cacheIndex[fileName];
  if (!cached) return true;
  
  return cached.hash !== currentHash;
}

/**
 * Mark file as processed
 */
export async function markProcessed(filePath, concepts, summary) {
  const cacheIndex = await loadCacheIndex();
  const currentHash = await getFileHash(filePath);
  const fileName = path.basename(filePath);
  
  cacheIndex[fileName] = {
    hash: currentHash,
    processedAt: new Date().toISOString(),
    concepts: concepts.length,
    hasSummary: !!summary
  };
  
  await saveCacheIndex(cacheIndex);
}

/**
 * Get cache stats
 */
export async function getCacheStats() {
  const cacheIndex = await loadCacheIndex();
  const files = Object.keys(cacheIndex);
  
  return {
    totalCached: files.length,
    totalConcepts: files.reduce((sum, f) => sum + (cacheIndex[f].concepts || 0), 0),
    oldestCache: files.length > 0 ? Math.min(...files.map(f => new Date(cacheIndex[f].processedAt).getTime())) : null
  };
}
