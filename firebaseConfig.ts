
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAKrvZ45I2LffVzzg_q9exIZjMqhkR_3Hg",
  authDomain: "kurs-yonetim-pro.firebaseapp.com",
  projectId: "kurs-yonetim-pro",
  storageBucket: "kurs-yonetim-pro.firebasestorage.app", 
  messagingSenderId: "50487616288",
  appId: "1:50487616288:web:36a3ad2fe7a73ce94e2d45"
};

// Singleton initialization to prevent "Component already registered" errors
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
