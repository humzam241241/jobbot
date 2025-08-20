import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const sourceType = url.searchParams.get("sourceType");
    const sourceId = url.searchParams.get("sourceId");

    if (!sourceType || !sourceId) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Check if application exists and is tracked
    const application = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
        sourceType,
        sourceId,
        status: { not: "untracked" },
      },
    });

    return NextResponse.json({
      ok: true,
      isTracked: !!application,
      application: application || null,
    });
  } catch (error: any) {
    console.error("Error checking application tracking:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to check tracking status" },
      { status: 500 }
    );
  }
}
