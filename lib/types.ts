export type Role = "admin" | "mentor" | "student";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  bio?: string;
  disabled?: boolean;
  createdAt: number;
  lastSeenNotificationsAt?: number;
  /** Set when an admin issued a temporary password; the portal asks them to choose their own. */
  mustChangePassword?: boolean;
};

export type PersonLite = { id: string; name: string; email?: string };

export type Course = {
  id: string;
  name: string;
  code: string;
  desc: string;
  hue: number;
  mentors: string[];
  createdAt: number;
};

export type CourseSummary = Course & {
  mentorNames: string[];
  students: number;
  sessions: number;
  assignments: number;
  nextSession: Pick<Session, "id" | "title" | "startsAt"> | null;
};

export type MeetingProvider = "zoom" | "meet" | "other";
export type Meeting = { provider: MeetingProvider; url: string } | null;

export type ResourceType = "slides" | "document" | "video" | "link";
export type Resource = { id: string; c: string; session: string; title: string; type: ResourceType; url: string; createdAt: number };

export type Session = {
  id: string;
  c: string;
  title: string;
  desc: string;
  startsAt: number;
  endsAt: number;
  /** Students can't see the session (or its resources) before this time. null = immediately. */
  availableFrom: number | null;
  meeting: Meeting;
  createdAt: number;
  resources?: Resource[];
};

export type Assignment = {
  id: string;
  c: string;
  session: string | null;
  title: string;
  desc: string;
  dueAt: number;
  maxMarks: number;
  allowLate: boolean;
  availableFrom: number | null;
  createdAt: number;
};

export type Submission = {
  id: string;
  g: string;
  s: string;
  c: string;
  link: string;
  note: string;
  submittedAt: number;
  late: boolean;
  marks: number | null;
  feedback: string;
  gradedAt: number | null;
};

/** Assignment as a list row: students get their own submission, staff get counts. */
export type AssignmentRow = Assignment & {
  mine?: Submission | null;
  stats?: { students: number; submitted: number; graded: number };
};

export type Announcement = {
  id: string;
  /** Course id, or null for a site-wide announcement. */
  c: string | null;
  courseName?: string;
  title: string;
  body: string;
  author: string;
  authorName: string;
  at: number;
};

export type NotificationKind = "announcement" | "site" | "assignment" | "grade" | "submission" | "session";
export type Notification = { id: string; kind: NotificationKind; title: string; body: string; at: number; href: string; unread: boolean };

export type AttendanceStatus = "present" | "late" | "absent";
export type AttendanceRecord = { session: string; student: string; status: AttendanceStatus; joinedAt: number | null; minutes: number };

export type CourseDetail = Course & { mentorPeople: PersonLite[]; canManage: boolean; students: number };

export type BulkRow = { name: string; email: string; role: Exclude<Role, "admin"> | "admin"; courses: string[] };
export type BulkResult = {
  email: string;
  name: string;
  status: "created" | "exists" | "duplicate" | "invalid" | "failed";
  error?: string;
  /** Temporary password for created accounts, so the admin can share it privately. */
  password?: string;
};

/** Single-use link that lets a mentor create their own account, already assigned to `courses`. */
export type Invite = {
  /** The doc id doubles as the secret token in the link. */
  id: string;
  role: "mentor";
  courses: string[];
  /** Who the link is for — shown to the admin and prefilled as the mentor's name. */
  label: string;
  createdAt: number;
  createdBy: string;
  usedAt: number | null;
  usedBy: string | null;
  usedByName: string | null;
};
