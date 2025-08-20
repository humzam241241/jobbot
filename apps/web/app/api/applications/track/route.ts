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
    const { sourceType, sourceId, title, company } = body;

    if (!sourceType || !sourceId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if application already exists
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
        sourceType,
        sourceId,
      },
    });

    if (existingApplication) {
      // Update existing application
      const updated = await prisma.application.update({
        where: { id: existingApplication.id },
        data: {
          status: "tracking",
          ...(title && { jobTitle: title }),
          ...(company && { company }),
        },
      });
      
      return NextResponse.json({
        ok: true,
        application: updated,
        isNew: false,
      });
    }

    // Create new application
    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        sourceType,
        sourceId,
        jobTitle: title || "Untitled Position",
        company: company || "Unknown Company",
        status: "tracking",
      },
    });

    return NextResponse.json({
      ok: true,
      application,
      isNew: true,
    });
  } catch (error: any) {
    console.error("Error tracking application:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to track application" },
      { status: 500 }
    );
  }
}
