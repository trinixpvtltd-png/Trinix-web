import { getApps, initializeApp, cert, getApp, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin";

let app: App;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("❌ Missing Firebase Admin environment variables.");
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApp();
}

const firestore = getFirestore(app);


if (!getApps().length) {
  firestore.settings({ ignoreUndefinedProperties: true });
}

export const adminDb = firestore;
