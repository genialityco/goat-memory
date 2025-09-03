// src/firebaseClient.ts
import { getApps, getApp, initializeApp } from "firebase/app";
import {
    getFirestore,
    initializeFirestore,
    type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!, // ver nota abajo
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,                 // asegúrate de tenerlo
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);

let _db: Firestore | null = null;
export const db = (() => {
    if (_db) return _db;
    try {
        // Debe ser la PRIMERA llamada de Firestore en el ciclo de vida
        _db = initializeFirestore(app, {
            experimentalAutoDetectLongPolling: true,
            // si el problema persiste, cambia a:
            // experimentalForceLongPolling: true,
        });
    } catch {
        _db = getFirestore(app);
    }
    return _db!;
})();
