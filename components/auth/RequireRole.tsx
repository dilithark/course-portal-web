"use client";

import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { Empty } from "../ui/bits";
import { useMe } from "./AuthProvider";

/** Client-side gate for role-only pages. The API enforces the same rules server-side. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const me = useMe();
  if (!roles.includes(me.role)) return <Empty icon="lock" title="You don’t have access to this page" />;
  return <>{children}</>;
}
