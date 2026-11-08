// Creates (or promotes) an admin account. Usage:
//   npm run create-admin -- <email> <password> "<Full name>"
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, password, name = "Admin"] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> <password (8+ chars)> "<Full name>"');
  process.exit(1);
}

const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key?.replace(/\\n/g, "\n") }) });
const auth = getAuth();

let user = await auth.getUserByEmail(email).catch(() => null);
if (user) await auth.updateUser(user.uid, { password, displayName: name });
else user = await auth.createUser({ email, password, displayName: name });

await getFirestore().collection("users").doc(user.uid).set({ name, email: email.toLowerCase(), role: "admin", createdAt: Date.now() });
console.log(`Admin ready: ${email} (${user.uid})`);
