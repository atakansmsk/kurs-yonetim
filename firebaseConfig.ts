
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase proje ayarları
const firebaseConfig = {
  apiKey: "AIzaSyAKrvZ45I2LffVzzg_q9exIZjMqhkR_3Hg",
  authDomain: "kurs-yonetim-pro.firebaseapp.com",
  projectId: "kurs-yonetim-pro",
  storageBucket: "kurs-yonetim-pro.firebasestorage.app", 
  messagingSenderId: "50487616288",
  appId: "1:50487616288:web:36a3ad2fe7a73ce94e2d45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// DATABASE INITIALIZATION
// Using standard getFirestore to avoid "Component not registered" errors 
// which often happen when complex cache settings conflict with CDN-loaded ESM modules.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
