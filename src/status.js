import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Processing status
let processingStatus = {
  isProcessing: false,
  currentFile: null,
  totalFiles: 0,
  processedFiles: 0,
  startTime: null,
  logs: []
};

export function getProcessingStatus() {
  return processingStatus;
}

export function updateProcessingStatus(update) {
  processingStatus = { ...processingStatus, ...update };
}

export function addProcessingLog(message) {
  processingStatus.logs.push({
    timestamp: new Date().toISOString(),
    message
  });
  // Keep only last 50 logs
  if (processingStatus.logs.length > 50) {
    processingStatus.logs = processingStatus.logs.slice(-50);
  }
}

export function resetProcessingStatus() {
  processingStatus = {
    isProcessing: false,
    currentFile: null,
    totalFiles: 0,
    processedFiles: 0,
    startTime: null,
    logs: []
  };
}
