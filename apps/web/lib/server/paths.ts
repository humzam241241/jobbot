import path from 'path';
import fs from 'fs';

// Get the absolute path to the downloads directory
export function getDownloadsDir() {
  const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
  
  // Ensure the downloads directory exists
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  
  return downloadsDir;
}

// Join paths safely for the downloads directory
export function joinDownload(...paths: string[]) {
  return path.join(getDownloadsDir(), ...paths);
}

// Get the public URL for a download file
export function getDownloadUrl(traceId: string, filename: string) {
  return `/downloads/${traceId}/${filename}`;
}

// Create a trace directory for storing files
export function createTraceDir(traceId: string) {
  const traceDir = joinDownload(traceId);
  if (!fs.existsSync(traceDir)) {
    fs.mkdirSync(traceDir, { recursive: true });
  }
  return traceDir;
}