"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, WhatsAppIcon, type IconName } from "./Icon";

export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  return <Image className={className} src="/logo.png" alt="Richmond Live" width={size} height={Math.round((size * 254) / 260)} priority />;
}

export function ErrorText({ err }: { err?: string }) {
  return err ? (
    <p className="er" role="alert">
      {err}
    </p>
  ) : null;
}

export function Empty({ icon = "book", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {children && <p className="mu">{children}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

/** Loading/error guard for useApi results. */
export function Async<T>({ q, children }: { q: { data?: T; error?: string; loading: boolean }; children: (d: T) => ReactNode }) {
  if (q.data !== undefined) return <>{children(q.data)}</>;
  if (q.error) return <div className="panel"><ErrorText err={q.error} /></div>;
  return <Loading />;
}

export function PageHeader({ title, sub, actions, eyebrow }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {sub && <p className="mu">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <header className="panel-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ icon, label, value, hint, tone }: { icon: IconName; label: string; value: ReactNode; hint?: ReactNode; tone?: "br" | "ok" | "warn" }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  );
}

export function Badge({ tone = "mu", children }: { tone?: "mu" | "ok" | "warn" | "er" | "br" | "info"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${h} 55% 32%)` }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Ext({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const safe = /^https?:\/\//i.test(href) ? href : undefined;
  return (
    <a className={className} href={safe} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="row-link">
      <span className="row-link-body">{children}</span>
      <Icon name="chevron" size={16} />
    </Link>
  );
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";

/** Opens a WhatsApp chat with the academy, pre-filled with `message`. */
export function ContactButton({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <a
      className="btn ghost sm contact"
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us on WhatsApp"
    >
      <WhatsAppIcon />
      {!compact && <span className="contact-label">Contact</span>}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      Made by Team <span>Richmond Live</span>
    </footer>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
