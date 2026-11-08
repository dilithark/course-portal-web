"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { CourseSummary, Notification } from "@/lib/types";
import { useToast } from "../ui/Toast";

type Portal = {
  courses: CourseSummary[] | undefined;
  reloadCourses: () => Promise<void>;
  notifications: Notification[];
  unread: number;
  markAllRead: () => Promise<void>;
  reloadNotifications: () => Promise<void>;
};

const Ctx = createContext<Portal | null>(null);

export function usePortal() {
  const p = useContext(Ctx);
  if (!p) throw new Error("usePortal must be used inside <PortalProvider>");
  return p;
}

const POLL_MS = 60_000;

export function PortalProvider({ children }: { children: ReactNode }) {
  const courses = useApi<CourseSummary[]>("/api/courses");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const known = useRef<Set<string> | null>(null);
  const toast = useToast();

  const reloadNotifications = useCallback(async () => {
    try {
      const list = await api<Notification[]>("/api/notifications");
      // Toast anything new that arrived since the last poll (not on first load).
      if (known.current) {
        const fresh = list.filter((n) => n.unread && !known.current!.has(n.id));
        if (fresh.length === 1) toast(fresh[0].title, "info");
        else if (fresh.length > 1) toast(`${fresh.length} new notifications`, "info");
      }
      known.current = new Set(list.map((n) => n.id));
      setNotifications(list);
    } catch {}
  }, [toast]);

  useEffect(() => {
    const first = setTimeout(reloadNotifications, 0);
    const t = setInterval(() => document.visibilityState === "visible" && reloadNotifications(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [reloadNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })));
    await api("/api/notifications", "POST").catch(() => {});
  }, []);

  const value = useMemo<Portal>(
    () => ({
      courses: courses.data,
      reloadCourses: courses.reload,
      notifications,
      unread: notifications.filter((n) => n.unread).length,
      markAllRead,
      reloadNotifications,
    }),
    [courses.data, courses.reload, notifications, markAllRead, reloadNotifications],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
