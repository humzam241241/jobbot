import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Unified import endpoint supporting two modes:
 * 1) POST multipart (existing upload flow)
 * 2) GET with ?fileId=... (Google Docs/Drive import using the user's session access token)
 *
 * Response shape (both modes):
 * { fileName: string, fileType: string, fileContentBase64: string }
 *
 * The caller can forward this payload to whatever pipeline expects the same shape,
 * or this route can be extended to call the pipeline directly.
 */

// Utility to convert ArrayBuffer/Uint8Array -> base64 string without leaking buffers in logs
function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // btoa expects binary string
  return Buffer.from(binary, 'binary').toString('base64');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const resourceKey = searchParams.get('resourceKey') || undefined;
    // Allow choosing export mime for debugging or specific pipelines
    const exportMime = searchParams.get('mime') || 'application/pdf'; // or text/plain

    if (!fileId) {
      return NextResponse.json({ error: 'Missing required query param: fileId' }, { status: 400 });
    }

    // Get the current user session to retrieve the Google access token
    const session = await getServerSession(authOptions as any);
    const accessToken = (session as any)?.accessToken as string | undefined;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Google. Please sign in again.' },
        { status: 401 }
      );
    }

    // Build export URL. resourceKey is needed for some Shared Drive/restricted items
    const exportUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`);
    exportUrl.searchParams.set('mimeType', exportMime);
    if (resourceKey) exportUrl.searchParams.set('resourceKey', resourceKey);

    const driveRes = await fetch(exportUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!driveRes.ok) {
      const text = await driveRes.text();
      return NextResponse.json(
        {
          error: `Google Drive export failed (${driveRes.status} ${driveRes.statusText})`,
          details: text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const arrayBuffer = await driveRes.arrayBuffer();
    const base64 = toBase64(arrayBuffer);

    const defaultExt = exportMime === 'text/plain' ? 'txt' : 'pdf';
    const fileName = `drive-${fileId}.${defaultExt}`;

    return NextResponse.json({
      fileName,
      fileType: exportMime,
      fileContentBase64: base64,
      source: 'google-drive',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to import Google Doc', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Existing upload flow: accept multipart/form-data with a single "file" field
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected multipart/form-data with a "file" field.' },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Missing file field in form data.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = toBase64(arrayBuffer);

    return NextResponse.json({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileContentBase64: base64,
      source: 'upload',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process upload', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}


