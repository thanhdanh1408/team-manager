/**
 * Firebase Admin SDK initialization (Server-side only)
 * Used in API routes for Firestore & Firebase Auth operations
 */
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;
let db: Firestore;
let adminAuth: Auth;

function getFirebaseAdmin() {
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  adminAuth = getAuth(app);

  return { app, db, adminAuth };
}

const { db: firestoreDb, adminAuth: firebaseAuth } = getFirebaseAdmin();

export { firestoreDb as db, firebaseAuth };
export default firestoreDb;
