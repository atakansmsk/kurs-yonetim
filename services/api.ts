
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
  // PROFESYONEL YÖNTEM: Google Cloud Storage Upload
  async saveFile(ownerId: string, file: Blob | File, onProgress?: (progress: number) => void): Promise<string> {
    // 1. Dosya için benzersiz bir yol oluştur
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    // Dosya uzantısını tahmin etmeye çalış (Blob ise jpg varsay, File ise name'den al)
    let extension = 'jpg'; 
    if (file instanceof File) {
        const parts = file.name.split('.');
        if (parts.length > 1) extension = parts.pop() || 'file';
    } else if (file.type === 'application/pdf') {
        extension = 'pdf';
    }

    const fileName = `files/${timestamp}_${random}.${extension}`;
    // Klasörleme: schools / {okul_sahibi_id} / files / {dosya_adi}
    const storageRef = ref(storage, `schools/${ownerId}/${fileName}`);

    // 2. Yükleme işlemini başlat (Resumable Upload)
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // İlerleme yüzdesi
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(Math.round(progress));
            },
            (error) => {
                // Hata durumu
                console.error("Upload error:", error);
                reject(error);
            },
            async () => {
                // 3. Başarılı bitiş - İndirme linkini al
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

  // Storage'dan dosya silme
  async deleteFile(url: string): Promise<void> {
    try {
      // Eğer URL Firebase Storage URL'i değilse işlem yapma
      if (!url.includes('firebasestorage')) return;
      
      // URL'den referans oluşturup silme
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn("File delete warning (might already be deleted):", error);
    }
  },
  
  // URL zaten public olduğu için fetch etmeye gerek yok, direkt URL döner
  // Eski kod ile uyumluluk için var.
  async getFile(ownerId: string, fileIdOrUrl: string): Promise<string | null> {
      return fileIdOrUrl;
  }
};
