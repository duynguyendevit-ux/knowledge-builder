import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';
import { processRawFiles } from './process.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '../raw');

console.log('👀 Watching for changes in raw directory...');
console.log(`📂 ${rawDir}`);

// Watch for file changes
const watcher = chokidar.watch(rawDir, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true
});

watcher
  .on('add', async (filePath) => {
    console.log(`\n📄 New file detected: ${path.basename(filePath)}`);
    await processRawFiles();
  })
  .on('change', async (filePath) => {
    console.log(`\n📝 File changed: ${path.basename(filePath)}`);
    await processRawFiles();
  })
  .on('unlink', (filePath) => {
    console.log(`\n🗑️  File removed: ${path.basename(filePath)}`);
  });

console.log('✅ Watcher started. Press Ctrl+C to stop.');
