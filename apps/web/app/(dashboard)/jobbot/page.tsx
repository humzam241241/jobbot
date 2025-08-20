"use client";
import { SectionCard } from "@/components/ui/SectionCard";
import EnhancedResumeKitForm from "@/components/jobbot/EnhancedResumeKitForm";

export default function JobBotPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">JobBot</h1>
        <p className="text-muted-foreground">Generate tailored resumes and cover letters for any job posting</p>
      </div>

      <SectionCard title="Generate Resume Kit">
        <EnhancedResumeKitForm />
      </SectionCard>
    </div>
  );
}
