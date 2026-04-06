
import { auth, db, storage } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { AppState, User } from '../types';

// --- YEREL MOD KONTROLÜ ---
let IS_LOCAL_MODE = false;

export const setLocalMode = (status: boolean) => {
  IS_LOCAL_MODE = status;
  if (status) {
    console.log("🔌 Uygulama YEREL MOD (Offline) olarak çalışıyor.");
  }
};

// --- INDEXED DB (Büyük dosyalar için yerel veritabanı) ---
const IDB_CONFIG = { name: 'KursProDB', store: 'files', version: 1 };

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IDB_CONFIG.store)) {
        db.createObjectStore(IDB_CONFIG.store, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- AUTH SERVİSİ ---
export const AuthService = {
  async login(email: string, pass: string): Promise<User | null> {
    if (IS_LOCAL_MODE) {
        // Yerel Modda sahte giriş
        return { id: "local_user", email: "yerel@cihaz", name: "Misafir Eğitmen" };
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const u = userCredential.user;
      return { id: u.uid, email: u.email!, name: u.displayName || "Kullanıcı" };
    } catch (error) {
      console.error("Giriş hatası:", error);
      return null;
    }
  },

  async loginGuest(): Promise<User> {
      setLocalMode(true);
      return { id: "local_user", email: "offline@app", name: "Misafir Eğitmen" };
  },

  async register(email: string, pass: string, name: string): Promise<boolean> {
    if (IS_LOCAL_MODE) return true; // Yerel modda kayıt simülasyonu
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      return true;
    } catch (error) {
      console.error("Kayıt hatası:", error);
      return false;
    }
  },

  async logout() {
    if (IS_LOCAL_MODE) {
        setLocalMode(false);
        window.location.reload(); // State temizlemek için en temizi
        return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  },

  getCurrentUser(): User | null {
    if (IS_LOCAL_MODE) return { id: "local_user", email: "offline@app", name: "Misafir Eğitmen" };
    const u = auth.currentUser;
    if (u) {
      return { id: u.uid, email: u.email!, name: u.displayName || "Kullanıcı" };
    }
    return null;
  }
};

// --- DATA SERVİSİ ---
export const DataService = {
  async saveUserData(userId: string, data: AppState): Promise<void> {
    if (IS_LOCAL_MODE) {
        localStorage.setItem(`kurs_data_${userId}`, JSON.stringify(data));
        return;
    }
    try {
      // DİKKAT: merge: true KALDIRILDI. 
      // Bu sayede silinen bir anahtar (öğrenci) veritabanında da üzerine yazılırken silinir.
      await setDoc(doc(db, "schools", userId), data); 
    } catch (e) {
      console.error("Cloud save error:", e);
      // Hata durumunda local storage'a yedekle (Offline desteği)
      localStorage.setItem(`kurs_data_backup_${userId}`, JSON.stringify(data));
      throw e;
    }
  },

  async getPublicSchoolData(userId: string): Promise<AppState | null> {
    if (IS_LOCAL_MODE || userId === 'local_user') {
        const localData = localStorage.getItem(`kurs_data_${userId}`);
        return localData ? JSON.parse(localData) : null;
    }
    try {
      const docRef = doc(db, "schools", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AppState;
      }
      return null;
    } catch (e) {
      console.error("Fetch error:", e);
      throw e;
    }
  },

  async updateStudentConsent(userId: string, studentId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    if (IS_LOCAL_MODE || userId === 'local_user') {
        const localData = localStorage.getItem(`kurs_data_${userId}`);
        if (localData) {
            const data = JSON.parse(localData) as AppState;
            if (data.students[studentId]) {
                data.students[studentId].consentStatus = status;
                data.students[studentId].consentDate = new Date().toISOString();
                data.updatedAt = new Date().toISOString();
                localStorage.setItem(`kurs_data_${userId}`, JSON.stringify(data));
            }
        }
        return;
    }
    try {
      const { updateDoc } = await import("firebase/firestore");
      const docRef = doc(db, "schools", userId);
      
      const updateData: any = {
          [`students.${studentId}.consentStatus`]: status,
          [`students.${studentId}.consentDate`]: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };
      
      await updateDoc(docRef, updateData);
    } catch (e) {
      console.error("Consent update error:", e);
      throw e;
    }
  },

  subscribeToUserData(userId: string, onUpdate: (data: AppState) => void, onError: (error: any) => void): () => void {
    if (IS_LOCAL_MODE) {
        // İlk yükleme
        const localData = localStorage.getItem(`kurs_data_${userId}`);
        if (localData) {
            onUpdate(JSON.parse(localData));
        }
        
        // Storage olaylarını dinle (Başka sekmede değişirse diye)
        const handler = (e: StorageEvent) => {
            if (e.key === `kurs_data_${userId}` && e.newValue) {
                onUpdate(JSON.parse(e.newValue));
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }

    const docRef = doc(db, "schools", userId);
    
    // Firebase Bağlantısı
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as AppState);
        } else {
          // Eğer döküman yoksa (yeni kullanıcı), boş dönmeyelim, bekleyelim.
        }
      }, 
      (error) => {
        console.error("Sync error:", error);
        // Firebase hatası verirse LocalStorage'dan kurtarmayı dene
        const backup = localStorage.getItem(`kurs_data_backup_${userId}`);
        if (backup) {
            console.log("Firebase çöktü, yerel yedekten yükleniyor...");
            onUpdate(JSON.parse(backup));
        } else {
            onError(error);
        }
      }
    );

    return unsubscribe;
  }
};

// --- DOSYA SERVİSİ ---
export const FileService = {
  async saveFile(ownerId: string, file: Blob | File, onProgress?: (progress: number) => void): Promise<string> {
    if (!file) throw new Error("Dosya seçilmedi.");

    // YEREL MOD (Local Mode)
    if (IS_LOCAL_MODE) {
        return new Promise(async (resolve, reject) => {
            try {
                if (onProgress) onProgress(50);
                
                // IndexedDB daha güvenli ve büyük dosyaları destekler.
                const db = await openDB();
                const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
                const store = tx.objectStore(IDB_CONFIG.store);
                
                const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                
                // Dosyayı Blob olarak sakla
                await store.put({ id: fileId, file: file, type: file.type, date: new Date() });
                
                if (onProgress) onProgress(100);
                console.log("Dosya yerel veritabanına kaydedildi:", fileId);
                
                // Yerel modda dosya ID'si döndürüyoruz. Görüntülerken bu ID ile çekeceğiz.
                resolve(fileId);
            } catch (e) {
                reject(new Error("Yerel kaydetme hatası: " + e));
            }
        });
    }

    // FIREBASE MODU
    let extension = 'bin';
    if (file instanceof File) {
        const parts = file.name.split('.');
        if (parts.length > 1) extension = parts.pop() || 'bin';
    } else if (file.type === 'application/pdf') {
        extension = 'pdf';
    } else if (file.type === 'image/jpeg') {
        extension = 'jpg';
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const fileName = `files/${timestamp}_${random}.${extension}`;
    const storageRef = ref(storage, `schools/${ownerId}/${fileName}`);

    console.log("Upload Başlatılıyor ->", storageRef.fullPath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
             if (uploadTask.snapshot.bytesTransferred === 0) {
                 uploadTask.cancel();
                 reject(new Error("Bağlantı zaman aşımı. İnternetinizi kontrol edin."));
             }
        }, 15000);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (snapshot.bytesTransferred > 0) clearTimeout(timeoutId);
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(Math.round(progress));
            },
            (error) => {
                clearTimeout(timeoutId);
                console.error("Firebase Storage Hatası:", error);
                reject(new Error("Yükleme başarısız. Yetki veya bağlantı hatası."));
            },
            async () => {
                clearTimeout(timeoutId);
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
  },

  async deleteFile(urlOrId: string): Promise<void> {
    if (IS_LOCAL_MODE || !urlOrId.startsWith('http')) {
        try {
            const db = await openDB();
            const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
            tx.objectStore(IDB_CONFIG.store).delete(urlOrId);
        } catch (e) { console.warn("Local delete error", e); }
        return;
    }

    try {
      if (!urlOrId.includes('firebasestorage')) return;
      const storageRef = ref(storage, urlOrId);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn("Dosya silinemedi:", error);
    }
  },
  
  // Dosyayı görüntülemek için URL üretir
  async getFile(ownerId: string, fileIdOrUrl: string): Promise<string | null> {
      // Eğer bir HTTP linki ise direkt döndür
      if (fileIdOrUrl.startsWith('http') || fileIdOrUrl.startsWith('data:')) return fileIdOrUrl;

      // Yerel dosya ID'si ise IndexedDB'den çekip URL oluştur
      try {
          const db = await openDB();
          const tx = db.transaction(IDB_CONFIG.store, 'readonly');
          const store = tx.objectStore(IDB_CONFIG.store);
          
          const record: any = await new Promise((resolve, reject) => {
              const req = store.get(fileIdOrUrl);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
          });

          if (record && record.file) {
              return URL.createObjectURL(record.file);
          }
      } catch (e) {
          console.error("Local file fetch error:", e);
      }
      return null;
  }
};
