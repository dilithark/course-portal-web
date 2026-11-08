"use client";

import { createContext, useContext } from "react";
import type { CourseDetail } from "@/lib/types";

export const CourseCtx = createContext<{ course: CourseDetail; reload: () => Promise<void> } | null>(null);

export function useCourse() {
  const c = useContext(CourseCtx);
  if (!c) throw new Error("useCourse must be used inside a course page");
  return c;
}
