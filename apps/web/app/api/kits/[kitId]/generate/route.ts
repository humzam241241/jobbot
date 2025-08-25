import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import path from 'path';
import { writeFile } from 'fs/promises';
import { google } from 'googleapis';

export async function POST(
  req: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { kitId } = params;
    const formData = await req.formData();
    
    // Get source document
    const file = formData.get('file') as File;
    const docUrl = formData.get('docUrl') as string;
    const gdocId = formData.get('gdocId') as string;
    const driveFileId = formData.get('driveFileId') as string;
    const accessToken = formData.get('accessToken') as string;
    
    // Get generation parameters
    const jobDescription = formData.get('jobDescription') as string;
    const provider = formData.get('provider') as string;
    const model = formData.get('model') as string;

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Save source document
    const docxPath = path.join(process.cwd(), 'storage', 'kits', kitId, 'source.docx');
    
    if (file) {
      // Handle direct file upload
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(docxPath, buffer);
    } else if (gdocId) {
      // Handle Google Doc ID
      await exportGoogleDoc(gdocId, docxPath);
    } else if (driveFileId && accessToken) {
      // Handle Google Drive file with user's access token
      await exportGoogleDriveFileWithToken(driveFileId, docxPath, accessToken);
    } else if (docUrl) {
      // Handle URL
      const response = await fetch(docUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(docxPath, buffer);
    } else {
      return NextResponse.json({ error: 'No document provided' }, { status: 400 });
    }

    // TODO: Process the document with the actual pipeline
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: "Document processed successfully",
      kitId
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

// Helper function to export Google Doc to DOCX
async function exportGoogleDoc(docId: string, outputPath: string) {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.export({
      fileId: docId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, {
      responseType: 'arraybuffer'
    });

    await writeFile(outputPath, Buffer.from(response.data as ArrayBuffer));
    return true;
  } catch (error) {
    console.error('Google Doc export error:', error);
    throw new Error('Failed to export Google Doc');
  }
}

// Helper function to export Google Drive file with user's access token
async function exportGoogleDriveFileWithToken(fileId: string, outputPath: string, accessToken: string) {
  try {
    // Create auth client with the user's access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Get file metadata to determine type
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType,name'
    });

    const mimeType = fileMetadata.data.mimeType;
    
    if (mimeType === 'application/vnd.google-apps.document') {
      // It's a Google Doc, so export it
      const response = await drive.files.export({
        fileId: fileId,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }, {
        responseType: 'arraybuffer'
      });
      
      await writeFile(outputPath, Buffer.from(response.data as ArrayBuffer));
      return true;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // It's already a DOCX file, download it directly
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });
      
      await writeFile(outputPath, Buffer.from(response.data as ArrayBuffer));
      return true;
    } else {
      throw new Error(`Unsupported file type: ${mimeType}. Please provide a Google Doc or DOCX file.`);
    }
  } catch (error) {
    console.error('Google Drive file export error:', error);
    throw new Error('Failed to export Google Drive file');
  }
}