import { NextRequest, NextResponse } from 'next/server';
import { createKitDirectory, saveUploadedFile, convertGoogleDoc, processDocxFile } from '@/lib/pipeline';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import debugLogger from '@/lib/utils/debug-logger';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const jobDescription = formData.get('jobDescription') as string;
    const provider = formData.get('provider') as string;
    const model = formData.get('model') as string;

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Create unique kit directory
    const kitId = await createKitDirectory();

    // Handle different input types
    let docxPath: string;

    const file = formData.get('file') as File;
    const docUrl = formData.get('docUrl') as string;
    const gdocId = formData.get('gdocId') as string;

    if (file) {
      // Handle file upload
      docxPath = await saveUploadedFile(kitId, file);
    } else if (gdocId) {
      // Handle Google Doc
      docxPath = await convertGoogleDoc(kitId, gdocId);
    } else if (docUrl) {
      // Handle URL
      docxPath = await saveUploadedFile(kitId, await fetch(docUrl).then(r => r.blob()));
    } else {
      return NextResponse.json({ error: 'No document provided' }, { status: 400 });
    }

    // Process the document
    const result = await processDocxFile(kitId, docxPath, jobDescription, {
      provider,
      model
    });

    return NextResponse.json({
      kitId,
      ...result
    });

  } catch (error) {
    debugLogger.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}