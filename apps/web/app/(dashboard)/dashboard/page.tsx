"use client";
import { SectionCard } from "@/components/ui/SectionCard";
import Link from "next/link";
import { Bot, FileText, BarChart3, Users } from "lucide-react";
import { pathOf } from "@/lib/routes";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Your AI-powered job application assistant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Quick Actions">
          <div className="space-y-3">
            <Link
              href={pathOf("jobbot")}
              className="button-primary flex items-center gap-3 no-underline"
            >
              <Bot className="h-5 w-5" />
              <div>
                <div className="font-medium">Generate Resume Kit</div>
                <div className="text-sm opacity-80">Create tailored resume and cover letter</div>
              </div>
            </Link>
            
            <Link
              href={pathOf("library")}
              className="button-secondary flex items-center gap-3 no-underline"
            >
              <FileText className="h-5 w-5" />
              <div>
                <div className="font-medium">View Library</div>
                <div className="text-sm opacity-70">Browse your generated documents</div>
              </div>
            </Link>
            
            <Link
              href={pathOf("applications")}
              className="button-secondary flex items-center gap-3 no-underline"
            >
              <BarChart3 className="h-5 w-5" />
              <div>
                <div className="font-medium">Track Applications</div>
                <div className="text-sm opacity-70">Monitor your job application progress</div>
              </div>
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity">
          <div className="text-center py-12">
            <div className="text-muted-foreground">No recent activity</div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}