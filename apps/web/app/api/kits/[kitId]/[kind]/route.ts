import { NextResponse } from "next/server";
import { getKitPdf } from "@/lib/pdf/kitStore";
import { env } from "@/lib/env";

export const runtime = env.nodeRuntime;
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { kitId: string; kind: string } }
) {
  const { kitId, kind } = params;
  const valid = ["resume","cover","ats"] as const;
  if (!valid.includes(kind as any)) {
    return NextResponse.json({ ok:false, error:"invalid kind" }, { status: 400 });
  }
  const buf = getKitPdf(kitId, kind as any);
  if (!buf) return NextResponse.json({ ok:false, error:"not found" }, { status: 404 });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${kind}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
