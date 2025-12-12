
import { auth, db, storage } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { AppState, User } from '../types';

// --- AUTH SERVİSİ ---
export const AuthService = {
  async login(email: string, pass: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const u = userCredential.user;
      return { id: u.uid, email: u.email!, name: u.displayName || "Kullanıcı" };
    } catch (error) {
      console.error("Giriş hatası:", error);
      return null;
    }
  },

  async register(email: string, pass: string, name: string): Promise<boolean> {
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
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  },

  getCurrentUser(): User | null {
    const u = auth.currentUser;
    if (u) {
      return { id: u.uid, email: u.email!, name: u.displayName || "Kullanıcı" };
    }
    return null;
  }
};

// --- DATA SERVİSİ (FIRESTORE) ---
export const DataService = {
  // Veriyi Buluta Yaz
  async saveUserData(userId: string, data: AppState): Promise<void> {
    try {
      await setDoc(doc(db, "schools", userId), data, { merge: true });
    } catch (e) {
      console.error("Cloud save error:", e);
      throw e;
    }
  },

  // Tek Seferlik Veri Çekme (Public View için)
  async getPublicSchoolData(userId: string): Promise<AppState | null> {
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

  // Canlı Dinleme (Realtime Sync)
  subscribeToUserData(userId: string, onUpdate: (data: AppState) => void, onError: (error: any) => void): () => void {
    const docRef = doc(db, "schools", userId);
    
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as AppState);
        }
      }, 
      (error) => {
        console.error("Sync error:", error);
        onError(error);
      }
    );

    return unsubscribe;
  }
};

// --- DOSYA SERVİSİ (FIREBASE STORAGE) ---
export const FileService = {
  // GÜVENLİ YÜKLEME
  async saveFile(ownerId: string, file: Blob | File, onProgress?: (progress: number) => void): Promise<string> {
    if (!file) throw new Error("Dosya seçilmedi.");

    // 1. Dosya uzantısı belirle
    let extension = 'bin';
    if (file instanceof File) {
        const parts = file.name.split('.');
        if (parts.length > 1) extension = parts.pop() || 'bin';
    } else if (file.type === 'application/pdf') {
        extension = 'pdf';
    } else if (file.type === 'image/jpeg') {
        extension = 'jpg';
    }

    // Dosya yolu
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const fileName = `files/${timestamp}_${random}.${extension}`;
    const storageRef = ref(storage, `schools/${ownerId}/${fileName}`);

    console.log("Upload Başlatılıyor ->", storageRef.fullPath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        // Zaman aşımı kontrolü (10 saniye içinde %0'ı geçmezse iptal et)
        const timeoutId = setTimeout(() => {
             if (uploadTask.snapshot.bytesTransferred === 0) {
                 uploadTask.cancel();
                 reject(new Error("Zaman aşımı: Bağlantı kurulamadı. Firebase Storage ayarlarını (CORS/Rules) kontrol edin."));
             }
        }, 15000);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (snapshot.bytesTransferred > 0) clearTimeout(timeoutId);

                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
                if (onProgress) {
                    try {
                        onProgress(Math.round(progress));
                    } catch (e) {}
                }
            },
            (error) => {
                clearTimeout(timeoutId);
                console.error("Firebase Storage Hatası:", error.code, error.message);
                
                if (error.code === 'storage/unauthorized') {
                   reject(new Error("YETKİ HATASI: Storage Rules (Kurallar) yazmaya izin vermiyor. Konsoldan 'allow write: if request.auth != null;' ekleyin."));
                } else if (error.code === 'storage/canceled') {
                   reject(new Error("Yükleme iptal edildi veya zaman aşımına uğradı."));
                } else if (error.code === 'storage/object-not-found' || error.code === 'storage/bucket-not-found') {
                   reject(new Error("Depolama alanı (Bucket) bulunamadı. firebaseConfig.ts dosyasındaki storageBucket adresini kontrol edin."));
                } else {
                   reject(new Error(`Yükleme başarısız: (${error.code})`));
                }
            },
            async () => {
                clearTimeout(timeoutId);
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (e) {
                    console.error("Download URL alma hatası:", e);
                    reject(e);
                }
            }
        );
    });
  },

  async deleteFile(url: string): Promise<void> {
    try {
      if (!url.includes('firebasestorage')) return;
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn("Dosya silinemedi:", error);
    }
  },
  
  async getFile(ownerId: string, fileIdOrUrl: string): Promise<string | null> {
      return fileIdOrUrl;
  }
};
