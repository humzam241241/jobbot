import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserUsage } from "@/lib/usage/counter";
import { createLogger } from '@/lib/logger';
import { withErrorHandler, jsonResponse } from "@/app/api/error-handler";

const logger = createLogger('resume-kit-api');

export const GET = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: { kitId: string } }
) => {
  const { kitId } = params;
  
  if (!kitId) {
    return jsonResponse(
      { 
        ok: false,
        error: { 
          code: "MISSING_ID", 
          message: "Kit ID is required" 
        } 
      },
      400
    );
  }
  
  logger.info('Fetching resume kit', { kitId });
  
  // Check if prisma is available
  if (!prisma) {
    throw new Error('Database client is not available');
  }
  
  // Get the kit from the database
  const kit = await prisma.resumeKit.findUnique({
    where: { id: kitId }
  }).catch(dbError => {
    logger.error('Database error fetching kit', { 
      kitId, 
      error: dbError instanceof Error ? dbError.message : String(dbError) 
    });
    throw new Error('Database error: Failed to fetch resume kit');
  });
  
  if (!kit) {
    logger.warn('Resume kit not found', { kitId });
    return jsonResponse(
      { 
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Resume kit not found"
        }
      },
      404
    );
  }
  
  // Get the current usage
  const usage = getUserUsage();
  
  return jsonResponse({
    ok: true,
    kit,
    usage
  });
});