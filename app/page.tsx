"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loading } from "@/components/ui/bits";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status !== "loading") router.replace(status === "ready" ? "/dashboard" : "/login");
  }, [status, router]);
  return (
    <div className="splash">
      <Loading />
    </div>
  );
}
