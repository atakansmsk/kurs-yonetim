
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Firebase proje ayarları
const firebaseConfig = {
  apiKey: "AIzaSyAKrvZ45I2LffVzzg_q9exIZjMqhkR_3Hg",
  authDomain: "kurs-yonetim-pro.firebaseapp.com",
  projectId: "kurs-yonetim-pro",
  storageBucket: "kurs-yonetim-pro.firebasestorage.app",
  messagingSenderId: "50487616288",
  appId: "1:50487616288:web:36a3ad2fe7a73ce94e2d45"
};

// Initialize Firebase (Compat)
// This initializes both the Compat and underlying Modular SDKs
const app = firebase.initializeApp(firebaseConfig);

// Export services
// db uses Compat API (v8 style) to avoid export issues with modular firestore
export const db = app.firestore();

// auth and storage use Modular API (v9 style) passed with the app instance
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
