import { google } from 'googleapis';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import crypto from 'crypto';

const STORAGE_DIR = join(process.cwd(), 'storage', 'kits');

export async function createKitDirectory() {
  const kitId = crypto.randomUUID();
  const kitDir = join(STORAGE_DIR, kitId);
  await mkdir(kitDir, { recursive: true });
  return kitId;
}

export async function saveUploadedFile(kitId: string, file: File | Blob) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const docxPath = join(STORAGE_DIR, kitId, 'source.docx');
  await writeFile(docxPath, buffer);
  return docxPath;
}

export async function convertGoogleDoc(kitId: string, docId: string, accessToken: string) {
  // Create OAuth2 client with the access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  // Create Drive client
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  // Get file metadata to check if it's a Google Doc
  const file = await drive.files.get({
    fileId: docId,
    fields: 'mimeType'
  });

  let response;
  if (file.data.mimeType === 'application/vnd.google-apps.document') {
    // Export Google Doc to DOCX
    response = await drive.files.export({
      fileId: docId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, {
      responseType: 'arraybuffer'
    });
  } else {
    // Download regular file
    response = await drive.files.get({
      fileId: docId,
      alt: 'media'
    }, {
      responseType: 'arraybuffer'
    });
  }

  const docxPath = join(STORAGE_DIR, kitId, 'source.docx');
  await writeFile(docxPath, Buffer.from(response.data as ArrayBuffer));
  return docxPath;
}

export async function processDocxFile(
  kitId: string,
  docxPath: string,
  jobDescription: string,
  options: { provider: string; model: string }
) {
  // TODO: Implement actual processing
  return {
    success: true,
    files: [
      `/kits/${kitId}/resume_tailored.docx`,
      `/kits/${kitId}/cover_letter.docx`,
      `/kits/${kitId}/ats_report.docx`
    ]
  };
}