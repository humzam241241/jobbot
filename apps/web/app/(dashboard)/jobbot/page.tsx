"use client";
import { SectionCard } from "@/components/ui/SectionCard";
import EnhancedResumeKitFormV2 from "@/components/jobbot/EnhancedResumeKitFormV2";
import ResumeDebugPanel from "@/components/debug/ResumeDebugPanel";
import { useSearchParams } from "next/navigation";

export default function JobBotPage() {
  const searchParams = useSearchParams();
  const debug = searchParams.get('debug') === 'true';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">JobBot</h1>
        <p className="text-muted-foreground">Generate tailored resumes and cover letters for any job posting</p>
      </div>

      <SectionCard title="Generate Resume Kit">
        <EnhancedResumeKitFormV2 />
      </SectionCard>
      
      {/* Debug panel - visible if ?debug=true is in URL or always shows minimized button */}
      <ResumeDebugPanel visible={debug} />
    </div>
  );
}
