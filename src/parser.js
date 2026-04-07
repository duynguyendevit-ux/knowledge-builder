import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Extract text from various file formats
 */
export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    switch (ext) {
      case '.md':
      case '.txt':
        return await fs.readFile(filePath, 'utf-8');
      
      case '.docx':
        return await extractDocx(filePath);
      
      case '.pdf':
        return await extractPdf(filePath);
      
      default:
        console.log(`⚠️  Unsupported file type: ${ext}`);
        return '';
    }
  } catch (error) {
    console.error(`❌ Failed to extract text from ${filePath}:`, error.message);
    return '';
  }
}

/**
 * Extract text from .docx files using python-docx
 */
async function extractDocx(filePath) {
  try {
    const { stdout } = await execAsync(
      `python3 -c "from docx import Document; doc = Document('${filePath}'); print('\\n'.join([p.text for p in doc.paragraphs]))"`
    );
    return stdout;
  } catch (error) {
    console.error('⚠️  python-docx not installed. Install with: pip3 install python-docx');
    return '';
  }
}

/**
 * Extract text from .pdf files using pdftotext
 */
async function extractPdf(filePath) {
  try {
    const outputPath = filePath.replace('.pdf', '.txt');
    await execAsync(`pdftotext "${filePath}" "${outputPath}"`);
    const text = await fs.readFile(outputPath, 'utf-8');
    await fs.unlink(outputPath); // Clean up temp file
    return text;
  } catch (error) {
    console.error('⚠️  pdftotext not installed. Install with: apt-get install poppler-utils');
    return '';
  }
}
