// Publishes firestore.rules using the service account in .env.local. Usage: npm run deploy-rules
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key?.replace(/\\n/g, "\n") }) });

const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(readFileSync("firestore.rules", "utf8"));
console.log(`Firestore rules released: ${ruleset.name}`);
