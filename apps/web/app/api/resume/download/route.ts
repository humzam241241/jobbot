import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('download-api');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Validate type parameter
    if (type !== 'resume' && type !== 'cover') {
      return new NextResponse('Invalid document type', { status: 400 });
    }

    // Construct file path
    const outputDir = path.join(process.cwd(), 'public', 'outputs');
    const fileName = `${id}_${type === 'resume' ? 'resume' : 'cover_letter'}.pdf`;
    const filePath = path.join(outputDir, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('File not found', { id, type, filePath });
      return new NextResponse('File not found', { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Content-Length', fileBuffer.length.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error: any) {
    logger.error('Error downloading file', { error });
    return new NextResponse('Error downloading file', { status: 500 });
  }
}
