import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { ensureKitDir } from "@/lib/fs/storage";
import { createLogger } from '@/lib/logger';

const logger = createLogger('api-kits');

/**
 * Creates a new kit
 * @returns The kit ID
 */
export async function POST() {
  try {
    const kitId = crypto.randomUUID();
    await ensureKitDir(kitId);
    
    logger.info(`Created new kit: ${kitId}`);
    
    return NextResponse.json({ 
      success: true,
      data: { kitId } 
    });
  } catch (error) {
    logger.error('Error creating kit', { error });
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create kit' 
    }, { status: 500 });
  }
}
