"use client";
import { SectionCard } from "@/components/ui/SectionCard";

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Applications</h1>
        <p className="text-muted-foreground">Track your job applications and their status</p>
      </div>

      <SectionCard title="Application Tracker">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Application tracking functionality coming soon...</div>
        </div>
      </SectionCard>
    </div>
  );
}
