"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Use NextAuth session instead of custom JWT check
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen text-white bg-[#0b1220] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login redirect if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen text-white bg-[#0b1220] flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-[#0b1220] bg-[radial-gradient(1200px_600px_at_100%_-10%,rgba(120,120,255,0.12),transparent),radial-gradient(900px_500px_at_-10%_-20%,rgba(120,255,255,0.10),transparent)]">
      <main className="max-w-7xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
