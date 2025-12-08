import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, DocumentSnapshot, DocumentData } from "firebase/firestore";
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

// --- DOSYA SERVİSİ (Hybrid Storage with Chunking) ---
const CHUNK_SIZE = 250000; // ~250KB (Mobil ağlar için güvenli boyut)

// Retry Helper: Hata alırsan 3 kere tekrar dene
const retryOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0) {
            console.warn(`Retrying... attempts left: ${retries}`);
            await new Promise(res => setTimeout(res, delay));
            return retryOperation(operation, retries - 1, delay * 1.5);
        }
        throw error;
    }
};

export const FileService = {
  // onProgress callback eklendi: (progress: number) => void
  async saveFile(ownerId: string, base64Data: string, onProgress?: (progress: number) => void): Promise<string> {
    const fileId = Math.random().toString(36).substr(2, 12);
    const totalLength = base64Data.length;

    try {
      if (totalLength <= CHUNK_SIZE) {
        // Küçük dosya: Tek parça
        if(onProgress) onProgress(50);
        // Path updated to: schools/{ownerId}/files/{fileId}
        await retryOperation(() => setDoc(doc(db, "schools", ownerId, "files", fileId), {
          content: base64Data,
          type: 'simple',
          createdAt: new Date().toISOString()
        }));
        if(onProgress) onProgress(100);
      } else {
        // Büyük dosya: Parçalama
        const chunks: string[] = [];
        for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
            chunks.push(base64Data.substring(i, i + CHUNK_SIZE));
        }

        const totalChunks = chunks.length;

        // Meta verisi - schools/{ownerId}/files/{fileId}
        await retryOperation(() => setDoc(doc(db, "schools", ownerId, "files", fileId), {
          type: 'chunked',
          totalChunks: totalChunks,
          createdAt: new Date().toISOString()
        }));

        // Parçaları sırayla yükle - schools/{ownerId}/files/{fileId}_{index}
        for (let index = 0; index < totalChunks; index++) {
             await retryOperation(() => setDoc(doc(db, "schools", ownerId, "files", `${fileId}_${index}`), {
                content: chunks[index],
                index: index
            }));
            
            // İlerleme yüzdesi hesapla
            if(onProgress) {
                const percent = Math.round(((index + 1) / totalChunks) * 100);
                onProgress(percent);
            }
        }
      }
      
      return fileId;
    } catch (error: any) {
      console.error("File save error details:", error);
      throw new Error(`Dosya yüklenemedi: ${error.message || "Erişim Reddedildi"}`);
    }
  },

  async getFile(ownerId: string, fileId: string): Promise<string | null> {
    try {
      // Look in user specific path
      const metaDocRef = doc(db, "schools", ownerId, "files", fileId);
      // Explicitly type the generic to avoid 'unknown' inference
      const metaSnap = await retryOperation<DocumentSnapshot<DocumentData>>(() => getDoc(metaDocRef));

      if (!metaSnap.exists()) return null;

      const data = metaSnap.data();

      if (data && data.type === 'chunked') {
          const totalChunks = data.totalChunks;
          
          // Promise.all ile paralel çekim
          const chunkPromises: Promise<DocumentSnapshot<DocumentData>>[] = [];
          for (let i = 0; i < totalChunks; i++) {
              chunkPromises.push(retryOperation<DocumentSnapshot<DocumentData>>(() => getDoc(doc(db, "schools", ownerId, "files", `${fileId}_${i}`))));
          }
          
          const chunkSnaps = await Promise.all(chunkPromises);
          let fullContent = "";
          
          for (let i = 0; i < totalChunks; i++) {
             const snap = chunkSnaps[i];
             if (snap.exists()) {
                 const snapData = snap.data();
                 if (snapData) {
                    fullContent += snapData.content;
                 }
             } else {
                 throw new Error("Dosya bozuk (eksik parça).");
             }
          }
          return fullContent;
      } else {
          return data?.content || null;
      }
    } catch (error) {
      console.error("File fetch error:", error);
      return null;
    }
  },

  async deleteFile(ownerId: string, fileId: string): Promise<void> {
    try {
      const metaRef = doc(db, "schools", ownerId, "files", fileId);
      const metaSnap = await getDoc(metaRef);
      
      if (metaSnap.exists()) {
          const data = metaSnap.data();
          await deleteDoc(metaRef);

          if (data && data.type === 'chunked') {
              const totalChunks = data.totalChunks;
              const deletePromises = [];
              for (let i = 0; i < totalChunks; i++) {
                  deletePromises.push(deleteDoc(doc(db, "schools", ownerId, "files", `${fileId}_${i}`)));
              }
              await Promise.all(deletePromises);
          }
      }
    } catch (error) {
      console.error("File delete error:", error);
    }
  }
};