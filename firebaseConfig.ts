import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase proje ayarları
const firebaseConfig = {
  apiKey: "AIzaSyAKrvZ45I2LffVzzg_q9exIZjMqhkR_3Hg",
  authDomain: "kurs-yonetim-pro.firebaseapp.com",
  projectId: "kurs-yonetim-pro",
  storageBucket: "kurs-yonetim-pro.appspot.com", 
  messagingSenderId: "50487616288",
  appId: "1:50487616288:web:36a3ad2fe7a73ce94e2d45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// DATABASE INITIALIZATION WITH SAFE FALLBACK
// MEB/Kurumsal ağlarda veya Gizli Sekmede "persistentLocalCache" (IndexedDB) engellenebilir.
// Bu durumda uygulama çökmek yerine "memoryLocalCache" (RAM) kullanarak açılmaya devam etmelidir.
let dbInstance;

try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  console.warn("Kalıcı hafıza başlatılamadı (Kısıtlı Ağ/Tarayıcı). RAM moduna geçiliyor.", error);
  try {
    // Fallback: Kalıcı hafıza çalışmazsa RAM kullan
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
  } catch (retryError) {
    // En kötü durum senaryosu: Varsayılan başlatma
    console.error("RAM modu da başarısız, varsayılan başlatma deneniyor.", retryError);
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;