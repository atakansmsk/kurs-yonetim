
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc } from "firebase/firestore";
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

// --- DATA SERVİSİ (FIRESTORE MODULAR API) ---
export const DataService = {
  // Veriyi Buluta Yaz
  async saveUserData(userId: string, data: AppState): Promise<void> {
    try {
      // setDoc with merge:true prevents overwriting fields if we were doing partial updates,
      // though currently we send the whole state. It's safer practice.
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

// --- DOSYA SERVİSİ (Hybrid Storage) ---
// Dosyaları ana veritabanı belgesinden ayırıp 'files' koleksiyonunda tutar.
// Bu sayede ana belge boyutu şişmez ve uygulama çökmez.
export const FileService = {
  async saveFile(base64Data: string): Promise<string> {
    try {
      const fileId = Math.random().toString(36).substr(2, 12);
      const fileRef = doc(collection(db, "files"), fileId);
      
      // Dosyayı parçalara bölmeden direkt kaydediyoruz (Firestore limiti 1MB)
      // Eğer base64 1MB'dan büyükse hata verebilir, frontend'de sıkıştırma şart.
      await setDoc(fileRef, {
        content: base64Data,
        createdAt: new Date().toISOString()
      });
      
      return fileId;
    } catch (error) {
      console.error("File save error:", error);
      throw new Error("Dosya kaydedilemedi. Boyut çok büyük olabilir.");
    }
  },

  async getFile(fileId: string): Promise<string | null> {
    try {
      const fileRef = doc(db, "files", fileId);
      const docSnap = await getDoc(fileRef);
      
      if (docSnap.exists()) {
        return docSnap.data().content;
      }
      return null;
    } catch (error) {
      console.error("File fetch error:", error);
      return null;
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "files", fileId));
    } catch (error) {
      console.error("File delete error:", error);
    }
  }
};
