import { NextRequest, NextResponse } from "next/server";
import { formidable } from "formidable";
import { promises as fs } from "fs";
import mammoth from "mammoth";
import pdf from "pdf-parse";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.type === "application/pdf") {
      const data = await pdf(buffer);
      text = data.text;
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.type === "text/plain") {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Error parsing resume file:", error);
    return NextResponse.json(
      { error: `Failed to parse file: ${error.message}` },
      { status: 500 }
    );
  }
}
