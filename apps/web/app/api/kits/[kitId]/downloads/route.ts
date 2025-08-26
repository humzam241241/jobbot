import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { kitDir, kitFileExists, readKitFile } from "@/lib/fs/storage";
import { createLogger } from '@/lib/logger';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const logger = createLogger('api-kits-downloads');

/**
 * Gets information about available files for a kit
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { kitId: string }}
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const file = searchParams.get('file');
    
    // If a specific file is requested, return it
    if (file) {
      const exists = await kitFileExists(params.kitId, file);
      
      if (!exists) {
        return NextResponse.json({ 
          success: false, 
          error: 'File not found' 
        }, { status: 404 });
      }
      
      const fileBuffer = await readKitFile(params.kitId, file);
      
      // Determine content type
      let contentType = 'application/octet-stream';
      if (file.endsWith('.pdf')) {
        contentType = 'application/pdf';
      } else if (file.endsWith('.docx')) {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      
      // Return the file
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${file}"`,
        },
      });
    }
    
    // Otherwise, list available files
    let dir = kitDir(params.kitId);
    let files: string[] = [];
    
    try {
      files = await fs.readdir(dir);
    } catch {
      // Fallback to the uploads/<kitId> directory used by the generator
      try {
        const alt = path.join(process.cwd(), 'uploads', params.kitId);
        files = await fs.readdir(alt);
        dir = alt;
      } catch {
        files = [];
      }
    }
    
    // If a manifest exists, prefer it
    try {
      const manifest = await fs.readFile(path.join(dir, 'manifest.json'), 'utf8');
      const parsed = JSON.parse(manifest);
      if (parsed?.files && Array.isArray(parsed.files)) {
        const fileStatus: Record<string, boolean> = {};
        for (const f of parsed.files) fileStatus[f] = files.includes(f);
        return NextResponse.json({ success: true, data: { files: fileStatus } });
      }
    } catch {}

    // Check for specific files
    const fileChecks = [
      'resume_tailored.docx',
      'resume_tailored.pdf',
      'cover_letter.docx',
      'cover_letter.pdf',
      'ats_report.docx',
      'ats_report.pdf',
      'input.docx'
    ];
    
    const fileStatus: Record<string, boolean> = {};
    
    for (const file of fileChecks) {
      fileStatus[file] = files.includes(file);
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { files: fileStatus } 
    });
  } catch (error) {
    logger.error('Error getting kit downloads', { error, kitId: params.kitId });
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get downloads' 
    }, { status: 500 });
  }
}
