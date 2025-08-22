import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { joinDownload } from "@/lib/server/paths";

export async function GET(_req: Request, { params }: { params: { traceId: string; file: string } }) {
  const abs = joinDownload(params.traceId, params.file);
  if (!fs.existsSync(abs)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  
  const ext = path.extname(params.file).toLowerCase();
  const type =
    ext === ".pdf"  ? "application/pdf" :
    ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
                      "application/octet-stream";
  
  const buf = fs.readFileSync(abs);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${params.file}"`
    }
  });
}