import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const GENERATED_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'generated');

async function getFiles() {
  try {
    await fs.access(GENERATED_DIR);
    const kitDirs = await fs.readdir(GENERATED_DIR, { withFileTypes: true });
    
    const allFiles = await Promise.all(
      kitDirs
        .filter(dir => dir.isDirectory())
        .map(async (dir) => {
          const kitDirPath = path.join(GENERATED_DIR, dir.name);
          const filesInKit = await fs.readdir(kitDirPath);
          
          return Promise.all(
            filesInKit.map(async (file) => {
              const filePath = path.join(kitDirPath, file);
              const stats = await fs.stat(filePath);
              return {
                name: file,
                path: `/generated/${dir.name}/${file}`,
                size: stats.size,
                createdAt: stats.birthtime.toISOString(),
              };
            })
          );
        })
    );

    return allFiles.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    // If the directory doesn't exist, return an empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function GET() {
  try {
    const files = await getFiles();
    return NextResponse.json({ ok: true, files });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Failed to list files', details: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { path: relativePath } = await req.json();
    
    if (!relativePath || typeof relativePath !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid file path' }, { status: 400 });
    }

    // Basic security check to prevent path traversal
    if (relativePath.includes('..')) {
        return NextResponse.json({ ok: false, error: 'Invalid path' }, { status: 400 });
    }

    const publicPath = path.join(process.cwd(), 'apps', 'web', 'public');
    const fullPath = path.join(publicPath, relativePath);

    // Ensure the file is within the public/generated directory
    if (!fullPath.startsWith(path.join(publicPath, 'generated'))) {
        return NextResponse.json({ ok: false, error: 'Unauthorized deletion attempt' }, { status: 403 });
    }

    await fs.unlink(fullPath);

    // Check if the parent directory is empty and delete it
    const parentDir = path.dirname(fullPath);
    const filesInDir = await fs.readdir(parentDir);
    if (filesInDir.length === 0) {
        await fs.rmdir(parentDir);
    }

    return NextResponse.json({ ok: true, message: 'File deleted successfully' });
  } catch (e: any) {
    if (e.code === 'ENOENT') {
        return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to delete file', details: e.message }, { status: 500 });
  }
}
