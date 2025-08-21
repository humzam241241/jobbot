import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getPublicDir } from "@/lib/server/paths";

export async function GET(_: Request, { params }: { params: { traceId: string; file: string } }) {
  const { traceId, file } = params;

  try {
    // Validate file name to prevent directory traversal
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      return NextResponse.json({ ok: false, error: "Invalid file name" }, { status: 400 });
    }

    const abs = path.join(getPublicDir(), "downloads", traceId, file);
    
    // Check if file exists
    if (!fs.existsSync(abs)) {
      console.error(`File not found: ${abs}`);
      return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
    }

    // Check file stats
    const stats = fs.statSync(abs);
    if (!stats.isFile()) {
      console.error(`Not a file: ${abs}`);
      return NextResponse.json({ ok: false, error: "Not a file" }, { status: 400 });
    }
    if (stats.size === 0) {
      console.error(`Empty file: ${abs}`);
      return NextResponse.json({ ok: false, error: "Empty file" }, { status: 400 });
    }

    // Determine content type
    const ext = path.extname(file).toLowerCase();
    const type = ext === ".pdf" ? "application/pdf" :
                ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
                "application/octet-stream";

    // Read file in chunks
    const stream = fs.createReadStream(abs);
    
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": type,
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "public, max-age=31536000",
      }
    });
  } catch (error) {
    console.error(`Error serving file ${file} for trace ${traceId}:`, error);
    return NextResponse.json(
      { ok: false, error: "Failed to serve file" },
      { status: 500 }
    );
  }
}