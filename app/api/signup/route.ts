import type { Invite } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { body, handler, HttpError, str } from "@/lib/server/http";
import { createAccount, EMAIL, existingAccounts, INVITE_TOKEN, password } from "@/lib/server/admin";

/**
 * Public self sign-up. Without an invite the account is a student with no courses (an admin assigns them).
 * With a valid mentor invite it's a mentor already assigned to the invite's courses, and the invite is used up.
 */
export const POST = handler(async (req) => {
  const b = await body(req);
  const name = str(b.name, 120, "Name");
  const email = str(b.email, 254, "Email").toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "That email address isn’t valid.");
  const pw = password(b.password);
  const token = typeof b.invite === "string" && b.invite ? b.invite : null;

  if ((await existingAccounts([email])).has(email)) throw new HttpError(409, "That email already has an account. Sign in instead.");

  if (!token) return { id: await createAccount({ name, email, role: "student", password: pw, courses: [], mustChangePassword: false }) };

  if (!INVITE_TOKEN.test(token)) throw new HttpError(404, "This invite link isn’t valid. Ask your course admin for a new one.");
  const ref = db().collection("invites").doc(token);
  // Claim the invite first so two people can't use the same link at once.
  const invite = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "This invite link isn’t valid. Ask your course admin for a new one.");
    const inv = snap.data() as Omit<Invite, "id">;
    if (inv.usedAt) throw new HttpError(410, "This invite link has already been used. Ask your course admin for a new one.");
    tx.update(ref, { usedAt: Date.now(), usedByName: name });
    return inv;
  });
  try {
    const id = await createAccount({ name, email, role: invite.role, password: pw, courses: invite.courses, mustChangePassword: false });
    await ref.update({ usedBy: id }).catch(() => {});
    return { id };
  } catch (e) {
    await ref.update({ usedAt: null, usedByName: null }).catch(() => {});
    throw e;
  }
});
