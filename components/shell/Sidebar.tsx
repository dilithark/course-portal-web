"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { useMe } from "../auth/AuthProvider";
import { Icon, type IconName } from "../ui/Icon";
import { Logo } from "../ui/bits";
import { usePortal } from "./PortalContext";

type Item = { href: string; label: string; icon: IconName; badge?: number };

function items(role: Role, unread: number): Item[] {
  const common: Item[] = [
    { href: "/announcements", label: "Announcements", icon: "megaphone" },
    { href: "/notifications", label: "Notifications", icon: "bell", badge: unread },
    { href: "/profile", label: "Profile", icon: "user" },
  ];
  if (role === "admin")
    return [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/courses", label: "Courses", icon: "book" },
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/invites", label: "Mentor invites", icon: "link" },
      { href: "/admin/announcements", label: "Site announcements", icon: "globe" },
      ...common,
    ];
  return [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }, { href: "/courses", label: "My courses", icon: "book" }, ...common];
}

const ROLE_LABEL: Record<Role, string> = { admin: "Super admin", mentor: "Mentor", student: "Student" };

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const me = useMe();
  const path = usePathname();
  const { courses, unread } = usePortal();
  const active = (href: string) => path === href || (href !== "/dashboard" && path.startsWith(href + "/"));

  return (
    <aside className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
      <Link href="/dashboard" className="side-brand" onClick={onNavigate}>
        <Logo size={40} />
        <span>
          Richmond Live <b>Academy</b>
        </span>
      </Link>
      <p className="side-role">{ROLE_LABEL[me.role]}</p>
      <nav className="side-nav">
        {items(me.role, unread).map((i) => (
          <Link key={i.href} href={i.href} className={active(i.href) && !(i.href === "/courses" && path.startsWith("/courses/")) ? "on" : ""} onClick={onNavigate}>
            <Icon name={i.icon} />
            <span>{i.label}</span>
            {!!i.badge && <em className="side-badge">{i.badge > 99 ? "99+" : i.badge}</em>}
          </Link>
        ))}
      </nav>
      {!!courses?.length && (
        <>
          <p className="side-section">{me.role === "admin" ? "All courses" : "Your courses"}</p>
          <nav className="side-nav courses">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} className={path.startsWith(`/courses/${c.id}`) ? "on" : ""} onClick={onNavigate}>
                <i className="dot" style={{ background: `hsl(${c.hue} 70% 52%)` }} />
                <span>{c.name}</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}
