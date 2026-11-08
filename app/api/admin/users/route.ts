import type { Course, Profile } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { body, handler, HttpError, oneOf, requireRole, str } from "@/lib/server/http";
import { courseIds, createAccount, existingAccounts, password, ROLES } from "@/lib/server/admin";

export const GET = handler(async (req) => {
  await requireRole(req, "admin");
  const [users, courses, enr] = await Promise.all([
    db().collection("users").get(),
    db().collection("courses").get(),
    db().collection("enrollments").get(),
  ]);
  const cs = courses.docs.map((d) => ({ id: d.id, ...d.data() }) as Course);
  return users.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Profile)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({
      ...u,
      courses: u.role === "mentor" ? cs.filter((c) => c.mentors.includes(u.id)).map((c) => c.id) : enr.docs.filter((e) => e.get("s") === u.id).map((e) => e.get("c") as string),
    }));
});

export const POST = handler(async (req) => {
  await requireRole(req, "admin");
  const b = await body(req);
  const name = str(b.name, 120, "Name");
  const email = str(b.email, 254, "Email").toLowerCase();
  const role = oneOf(b.role, ROLES, "Role");
  const pw = password(b.password);
  const courses = courseIds(b.courses);

  const ex = (await existingAccounts([email])).get(email);
  if (ex) throw new HttpError(409, ex.where === "portal" ? `${email} already has an account (${ex.role}${ex.name ? `, ${ex.name}` : ""}).` : `${email} already has a login but no portal profile.`);

  return { id: await createAccount({ name, email, role, password: pw, courses, mustChangePassword: true }) };
});
