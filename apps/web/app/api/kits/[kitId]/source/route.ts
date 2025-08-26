import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

function kitDir(kitId: string) {
  // Align with generator output directory
  return path.join(process.cwd(), 'uploads', kitId);
}

export async function POST(req: NextRequest, { params }: { params: { kitId: string }}) {
  console.log('Source API called for kitId:', params.kitId);
  const dir = kitDir(params.kitId);
  const ctype = req.headers.get("content-type") || "";

  if (ctype.includes("application/json")) {
    console.log('Processing JSON payload');
    const { type, fileId, accessToken } = await req.json();
    
    if (type === "gdoc" && fileId) {
      console.log('Processing Google Doc via REST export:', fileId);
      try {
        if (!accessToken) {
          console.error('No access token provided');
          return NextResponse.json(
            { ok: false, message: "No access token provided" }, 
            { status: 401 }
          );
        }

        const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
        const resp = await fetch(exportUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Drive export failed: ${resp.status} ${resp.statusText} - ${text}`);
        }
        const arrayBuf = await resp.arrayBuffer();

        await fs.mkdir(dir, { recursive: true });
        const out = path.join(dir, "source.docx");
        await fs.writeFile(out, Buffer.from(arrayBuf));
        console.log('Saved to', out);
        return NextResponse.json({ ok: true, kind: "gdoc->docx" });
      } catch (e: any) {
        console.error('Drive export error:', e);
        return NextResponse.json(
          { ok: false, message: e.message || "Drive export failed" }, 
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ ok: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  // multipart .docx (existing behavior)
  console.log('Processing form data');
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, message: "No file uploaded" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ ok: false, message: "Only .docx accepted" }, { status: 400 });
  }
  await fs.mkdir(dir, { recursive: true });
  const array = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, "source.docx"), array);
  console.log('File uploaded successfully');
  return NextResponse.json({ ok: true, kind: "docx" });
}