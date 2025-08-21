import { NextRequest, NextResponse } from 'next/server';
import { runTailorPipeline } from '@/lib/pipeline';
import { logDebug, createTraceId } from '@/lib/pipeline/trace';

// Feature flag for the new pipeline
const useNewPipeline = process.env.RESUME_PIPELINE_V2 !== 'false';

export async function POST(req: NextRequest) {
  const traceId = createTraceId();
  
  try {
    // Check if we should use the new pipeline
    if (!useNewPipeline) {
      // Forward to the legacy endpoint
      const legacyUrl = new URL('/api/resume/generate', req.url);
      return NextResponse.rewrite(legacyUrl);
    }

    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      logDebug(traceId, 'api', 'error', 'Missing OPENAI_API_KEY', {});
      return NextResponse.json(
        { error: 'API configuration error', details: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const jobDescription = formData.get('jobDescription') as string;

    if (!file) {
      logDebug(traceId, 'api', 'error', 'Missing file', {});
      return NextResponse.json({ error: 'Missing resume file' }, { status: 400 });
    }

    if (!jobDescription) {
      logDebug(traceId, 'api', 'error', 'Missing job description', {});
      return NextResponse.json({ error: 'Missing job description' }, { status: 400 });
    }

    // Get the file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    
    // Log the request
    logDebug(traceId, 'api', 'info', 'Processing resume', { 
      fileName, 
      fileSize: buffer.length,
      jdLength: jobDescription.length 
    });

    // Run the pipeline
    const result = await runTailorPipeline(buffer, fileName, jobDescription);
    
    // Return the results
    return NextResponse.json({
      traceId: result.traceId,
      downloads: result.downloads
    });
  } catch (error: any) {
    logDebug(traceId, 'api', 'error', 'Pipeline error', { 
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: 'Resume tailoring failed',
        details: error.message,
        traceId
      },
      { status: 500 }
    );
  }
}
