"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../layout/Sidebar";
import MobileNav from "../layout/MobileNav";
import TopNav from "../layout/TopNav";

export default function AppShell({ 
  children, 
  title,
  description,
  headerActions
}: { 
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
}) {
  // Removed custom requireAuth() which redirected based on a non-NextAuth JWT and caused loops

  return (
    <>
      {title && (
        <div className="mb-6">
          {/* header block intentionally left minimal */}
        </div>
      )}
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <TopNav />
          <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <MobileNav />
    </>
  );
}


