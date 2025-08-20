import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

async function getLibraryItems() {
  const generatedDir = path.join(process.cwd(), 'apps', 'web', 'public', 'generated');
  try {
    const kitDirs = await fs.readdir(generatedDir, { withFileTypes: true });
    const metadataPromises = kitDirs
      .filter(dirent => dirent.isDirectory())
      .map(async (dirent) => {
        const metadataPath = path.join(generatedDir, dirent.name, 'metadata.json');
        try {
          const content = await fs.readFile(metadataPath, 'utf-8');
          return JSON.parse(content);
        } catch (e) {
          // metadata.json might not exist or be readable, skip this entry
          return null;
        }
      });
      
    const allMetadata = await Promise.all(metadataPromises);
    // Filter out nulls and sort by date descending
    return allMetadata.filter(Boolean).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  } catch (error) {
    // If 'generated' directory doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function GET() {
  try {
    const items = await getLibraryItems();
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    console.error('Failed to fetch library items:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch library items', details: error.message }, { status: 500 });
  }
}
