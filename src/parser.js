import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { callLLM } from './llm.js';

const execAsync = promisify(exec);

/**
 * Check if file is an image
 */
export function isImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
}

/**
 * Extract text from various file formats
 */
export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    // Handle images
    if (isImage(filePath)) {
      return await extractImage(filePath);
    }
    
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

/**
 * Extract content from images using vision LLM
 */
async function extractImage(filePath) {
  try {
    console.log(`  🖼️  Processing image with vision model...`);
    
    // Read image as base64
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    
    // Use vision model to describe image
    const prompt = `Analyze this image and provide:

1. **Description**: What is shown in the image? (2-3 sentences)
2. **Key Concepts**: List 5-10 important concepts, terms, or topics visible in the image
3. **Text Content**: If there is any text in the image (diagrams, slides, screenshots), transcribe it
4. **Context**: What is the purpose or context of this image?

Format your response as:

DESCRIPTION:
[description]

KEY CONCEPTS:
- [concept 1]
- [concept 2]
...

TEXT CONTENT:
[any text found]

CONTEXT:
[context]`;
    
    const systemPrompt = 'You are an expert at analyzing images and extracting structured information. Be thorough and precise.';
    
    // Call LLM with image
    const response = await callLLM(prompt, systemPrompt, {
      image: {
        data: base64Image,
        mimeType: mimeType
      }
    });
    
    return response;
  } catch (error) {
    console.error('⚠️  Failed to process image:', error.message);
    return '';
  }
}
