// Creates the four Richmond Live Academy courses (safe to re-run). Usage: npm run seed-courses
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key?.replace(/\\n/g, "\n") }) });
const db = getFirestore();

const COURSES = [
  { id: "web-development", code: "WEB", hue: 212, name: "Web Development", desc: "Build modern, responsive websites and web apps — HTML, CSS, JavaScript, React and deployment." },
  { id: "video-editing", code: "VED", hue: 278, name: "Video Editing", desc: "Cut, colour and finish professional video — storytelling, pacing, colour grading and audio." },
  { id: "live-production", code: "LIV", hue: 350, name: "Live Production", desc: "Run multi-camera live shows and streams — switching, graphics, audio and on-air workflow." },
  { id: "conceptual-designing", code: "CDS", hue: 32, name: "Conceptual Designing", desc: "Develop strong visual concepts — ideation, moodboards, brand thinking and presentation." },
];

let i = 0;
for (const { id, ...c } of COURSES) {
  const ref = db.collection("courses").doc(id);
  const snap = await ref.get();
  if (snap.exists) console.log(`exists  ${c.name}`);
  else {
    await ref.set({ ...c, mentors: [], createdAt: Date.now() + i });
    console.log(`created ${c.name}`);
  }
  i++;
}
