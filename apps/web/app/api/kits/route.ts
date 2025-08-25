import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// Create a new kit with a unique ID
export async function POST(req: NextRequest) {
  try {
    const kitId = uuidv4();
    console.log('Creating new kit with ID:', kitId);
    
    // Create the kit directory
    const kitDir = path.join(process.cwd(), 'public', 'kits', kitId);
    await fs.mkdir(kitDir, { recursive: true });
    
    return NextResponse.json({ kitId });
  } catch (error) {
    console.error('Error creating kit:', error);
    return NextResponse.json(
      { error: 'Failed to create kit' },
      { status: 500 }
    );
  }
}
