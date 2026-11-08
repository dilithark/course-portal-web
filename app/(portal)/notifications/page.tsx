"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePortal } from "@/components/shell/PortalContext";
import { KIND_ICON } from "@/components/shell/Topbar";
import { Icon } from "@/components/ui/Icon";
import { Empty, PageHeader } from "@/components/ui/bits";
import { dateTime, relative } from "@/lib/time";

export default function NotificationsPage() {
  const { notifications, unread, markAllRead, reloadNotifications } = usePortal();
  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  return (
    <>
      <PageHeader
        title="Notifications"
        sub={unread ? `${unread} unread` : "You’re all caught up."}
        actions={!!unread && <button className="btn ghost" onClick={markAllRead}><Icon name="check" /> Mark all as read</button>}
      />
      {notifications.length ? (
        <ul className="panel notif-list">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link href={n.href} className={`notif${n.unread ? " unread" : ""}`}>
                <span className={`notif-icon ${n.kind}`}><Icon name={KIND_ICON[n.kind]} /></span>
                <span className="grow">
                  <b>{n.title}</b>
                  {n.body && <small className="clamp">{n.body}</small>}
                </span>
                <small className="mu" title={dateTime(n.at)}>{relative(n.at)}</small>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon="bell" title="No notifications">New announcements, assignments and grades will show up here.</Empty>
      )}
    </>
  );
}
