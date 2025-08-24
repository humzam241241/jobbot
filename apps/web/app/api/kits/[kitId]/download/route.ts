import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, getMockResumeKit } from "@/lib/db";
import { debugLogger } from "@/lib/utils/debug-logger";

// Helper: DB enabled?
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const isDbEnabled = process.env.SKIP_DB !== '1' && !!hasValidDatabaseUrl && !!prisma;

export async function GET(
  req: NextRequest, 
  { params }: { params: { kitId: string } }
) {
  const kitId = params.kitId;
  const fileType = req.nextUrl.searchParams.get("file"); // 'resume'|'cover'|'ats'
  
  try {
    debugLogger.debug('Download request received', { 
      component: 'API:kits/download',
      kitId,
      fileType
    });
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      debugLogger.debug('Authentication failed', { 
        component: 'API:kits/download',
        session
      });
      return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get resume kit to verify ownership
    let kit;
    if (isDbEnabled) {
      debugLogger.debug('Fetching kit from database', { 
        component: 'API:kits/download',
        kitId
      });
      kit = await (prisma as any)!.resumeKit.findUnique({
        where: { id: kitId }
      });
    } else {
      debugLogger.debug('Fetching mock kit', { 
        component: 'API:kits/download',
        kitId
      });
      kit = getMockResumeKit(kitId);
    }
    
    if (!kit) {
      debugLogger.debug('Kit not found', { 
        component: 'API:kits/download',
        kitId
      });
      return new Response(JSON.stringify({ success: false, error: { message: 'Not Found' } }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user has access to this kit
    if (kit.userId !== (session.user as any).id) {
      debugLogger.debug('User does not have access to this kit', { 
        component: 'API:kits/download',
        kitId,
        userId: (session.user as any).id,
        kitUserId: kit.userId
      });
      return new Response(JSON.stringify({ success: false, error: { message: 'Forbidden' } }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Determine file name and path
    let fileName: string;
    switch (fileType) {
      case 'cover':
        fileName = "cover-letter.pdf";
        break;
      case 'ats':
        // Check if we have an ATS PDF (style-preserve) or HTML/JSON
        const atsPdfPath = path.join(process.cwd(), "public/kits", kitId, "ats.pdf");
        const atsHtmlPath = path.join(process.cwd(), "public/kits", kitId, "ats.html");
        const atsJsonPath = path.join(process.cwd(), "public/kits", kitId, "ats.json");
        
        try {
          // Try PDF first (style-preserve)
          await fs.access(atsPdfPath);
          fileName = "ats.pdf";
        } catch {
          // Try HTML next
          try {
            await fs.access(atsHtmlPath);
            fileName = "ats.html";
          } catch {
            // Default to JSON
            fileName = "ats.json";
          }
        }
        break;
      default:
        fileName = "resume.pdf";
    }
    
    const filePath = path.join(process.cwd(), "public/kits", kitId, fileName);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Read file
      const buffer = await fs.readFile(filePath);
      
      // Determine content type
      let contentType = "application/pdf";
      if (fileName.endsWith(".html")) {
        contentType = "text/html";
      } else if (fileName.endsWith(".json")) {
        contentType = "application/json";
      }
      
      debugLogger.debug('Sending file', { 
        component: 'API:kits/download',
        kitId,
        fileName,
        contentType,
        fileSize: buffer.length
      });
      
      // Return file
      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": buffer.length.toString()
        }
      });
    } catch (error) {
      debugLogger.error('File not found', { 
        component: 'API:kits/download',
        kitId,
        fileName,
        error
      });
      return new Response(JSON.stringify({ success: false, error: { message: 'File Not Found' } }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    debugLogger.error('Error processing download request', { 
      component: 'API:kits/download',
      kitId,
      fileType,
      error
    });
    return new Response(JSON.stringify({ success: false, error: { message: 'Internal Server Error' } }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}