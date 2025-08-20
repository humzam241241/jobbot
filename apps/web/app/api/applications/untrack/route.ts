import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { sourceType, sourceId } = body;

    if (!sourceType || !sourceId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the application
    const application = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
        sourceType,
        sourceId,
      },
    });

    if (!application) {
      return NextResponse.json(
        { ok: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Update the application status to "untracked"
    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "untracked" },
    });

    return NextResponse.json({
      ok: true,
      application: updated,
    });
  } catch (error: any) {
    console.error("Error untracking application:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to untrack application" },
      { status: 500 }
    );
  }
}
