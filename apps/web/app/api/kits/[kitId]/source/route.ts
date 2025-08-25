import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";

function kitDir(kitId: string) {
  return path.join(process.cwd(), 'public', 'kits', kitId);
}

export async function POST(req: NextRequest, { params }: { params: { kitId: string }}) {
  console.log('Source API called for kitId:', params.kitId);
  const dir = kitDir(params.kitId);
  const ctype = req.headers.get("content-type") || "";

  if (ctype.includes("application/json")) {
    console.log('Processing JSON payload');
    const { type, fileId, accessToken } = await req.json();
    
    if (type === "gdoc" && fileId) {
      console.log('Processing Google Doc:', fileId);
      try {
        if (!accessToken) {
          console.error('No access token provided');
          return NextResponse.json(
            { ok: false, message: "No access token provided" }, 
            { status: 401 }
          );
        }

        console.log('Using access token to export Google Doc');
        const oauth2 = new google.auth.OAuth2();
        oauth2.setCredentials({ access_token: accessToken });
        const drive = google.drive({ version: "v3", auth: oauth2 });

        const res = await drive.files.export(
          { fileId, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
          { responseType: "arraybuffer" }
        );

        console.log('Google Doc exported successfully');
        await fs.mkdir(dir, { recursive: true });
        const out = path.join(dir, "input.docx");
        await fs.writeFile(out, Buffer.from(res.data as ArrayBuffer));
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
  await fs.writeFile(path.join(dir, "input.docx"), array);
  console.log('File uploaded successfully');
  return NextResponse.json({ ok: true, kind: "docx" });
}