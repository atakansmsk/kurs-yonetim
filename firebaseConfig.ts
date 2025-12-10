
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase proje ayarları
const firebaseConfig = {
  apiKey: "AIzaSyAKrvZ45I2LffVzzg_q9exIZjMqhkR_3Hg",
  authDomain: "kurs-yonetim-pro.firebaseapp.com",
  projectId: "kurs-yonetim-pro",
  // Düzeltme: Varsayılan bucket genellikle .appspot.com ile biter
  storageBucket: "kurs-yonetim-pro.appspot.com", 
  messagingSenderId: "50487616288",
  appId: "1:50487616288:web:36a3ad2fe7a73ce94e2d45"
};

// Initialize Firebase (Modular SDK)
const app = initializeApp(firebaseConfig);

// Enable offline persistence (Çevrimdışı veritabanı desteği)
// Bu özellik sayesinde DNS sorunu olsa bile program önbellekten açılır
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;