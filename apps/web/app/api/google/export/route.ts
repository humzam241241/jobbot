import { google } from 'googleapis';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get('fileId');
    const authHeader = req.headers.get('Authorization');
    
    if (!fileId) {
      return new Response('File ID is required', { status: 400 });
    }
    
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Authorization header is required', { status: 401 });
    }
    
    const accessToken = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Initialize Google Drive client with the access token
    const drive = google.drive({
      version: 'v3',
      auth: {
        type: 'OAuth2',
        token: accessToken
      }
    });

    // Get file metadata to check if it's a Google Doc
    const file = await drive.files.get({
      fileId,
      fields: 'mimeType,name'
    });

    // If it's a Google Doc, export as DOCX
    if (file.data.mimeType === 'application/vnd.google-apps.document') {
      const response = await drive.files.export({
        fileId,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }, {
        responseType: 'arraybuffer'
      });

      return new Response(response.data as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${file.data.name}.docx"`
        }
      });
    }
    
    // If it's already a DOCX, just download it
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, {
      responseType: 'arraybuffer'
    });

    return new Response(response.data as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${file.data.name}"`
      }
    });

  } catch (error: any) {
    console.error('Google Drive export error:', error);
    return new Response(error.message || 'Failed to export file', { 
      status: error.code || 500 
    });
  }
}