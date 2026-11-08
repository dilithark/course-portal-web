"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ForcePasswordChange } from "@/components/auth/ForcePasswordChange";
import { PortalProvider } from "@/components/shell/PortalContext";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { Footer, Loading } from "@/components/ui/bits";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { status, me } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (status === "signedOut") router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [status, router, path]);

  if (status !== "ready") return <div className="splash"><Loading label={status === "loading" ? "Loading your portal…" : "Redirecting to sign in…"} /></div>;

  if (me?.mustChangePassword) return <ForcePasswordChange />;

  return (
    <PortalProvider>
      <div className="app">
        <Sidebar open={menu} onNavigate={() => setMenu(false)} />
        {menu && <div className="scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
        <div className="app-main">
          <Topbar onMenu={() => setMenu(true)} />
          <main className="content">{children}</main>
          <Footer />
        </div>
      </div>
    </PortalProvider>
  );
}
