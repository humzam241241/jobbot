"use client";
import { SectionCard } from "@/components/ui/SectionCard";

export default function ScraperPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Job Scraper</h1>
        <p className="text-muted-foreground">Search and scrape job postings from various platforms</p>
      </div>

      <SectionCard title="Job Scraper">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Job scraper functionality coming soon...</div>
        </div>
      </SectionCard>
    </div>
  );
}
