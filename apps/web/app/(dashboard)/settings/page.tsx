"use client";
import { SectionCard } from "@/components/ui/SectionCard";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and configuration</p>
      </div>

      <SectionCard title="Account Settings">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Settings page coming soon...</div>
        </div>
      </SectionCard>
    </div>
  );
}
