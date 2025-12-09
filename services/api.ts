
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, DocumentSnapshot, DocumentData, writeBatch } from "firebase/firestore";
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

// --- DOSYA SERVİSİ (Hybrid Storage with Batching) ---
const CHUNK_SIZE = 250000; // ~250KB

// Retry Helper
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
  // BATCH UPLOAD: Tüm parçaları tek seferde atomik olarak yükler.
  // Bu sayede "yarım yüklenen" dosya sorunu ortadan kalkar.
  async saveFile(ownerId: string, base64Data: string, onProgress?: (progress: number) => void): Promise<string> {
    const fileId = Math.random().toString(36).substr(2, 12);
    const totalLength = base64Data.length;

    // 1. Veriyi hazırla (Chunks)
    // Retry sırasında veriyi tekrar tekrar bölmeye gerek yok, bir kere hazırlıyoruz.
    const chunks: string[] = [];
    let isChunked = false;

    if (totalLength <= CHUNK_SIZE) {
        chunks.push(base64Data);
    } else {
        isChunked = true;
        for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
            chunks.push(base64Data.substring(i, i + CHUNK_SIZE));
        }
    }

    if(onProgress) onProgress(20);

    // 2. Retry için sarılmış işlem fonksiyonu
    // KRİTİK DÜZELTME: Her denemede YENİ bir batch oluşturuyoruz.
    // Eskiden batch dışarıda oluşturulup içeride commit ediliyordu, bu da hata veriyordu.
    const uploadOperation = async () => {
        const batch = writeBatch(db); // YENİ BATCH OLUŞTUR
        
        if (!isChunked) {
             const docRef = doc(db, "schools", ownerId, "files", fileId);
             batch.set(docRef, {
                 content: chunks[0],
                 type: 'simple',
                 createdAt: new Date().toISOString()
             });
        } else {
             const metaRef = doc(db, "schools", ownerId, "files", fileId);
             batch.set(metaRef, {
                 type: 'chunked',
                 totalChunks: chunks.length,
                 createdAt: new Date().toISOString()
             });

             chunks.forEach((chunk, index) => {
                 const chunkRef = doc(db, "schools", ownerId, "files", `${fileId}_${index}`);
                 batch.set(chunkRef, {
                     content: chunk,
                     index: index
                 });
             });
        }
        
        // Batch'i commit et
        await batch.commit();
    };

    try {
        if(onProgress) onProgress(50);
        // RetryHelper tüm işlemi (batch oluşturma + commit) baştan dener
        await retryOperation(uploadOperation);
        
        if(onProgress) onProgress(100);
        
        return fileId;
    } catch (error: any) {
        console.error("File save error details:", error);
        throw new Error(`Dosya yüklenemedi: ${error.message || "Bağlantı hatası"}`);
    }
  },

  async getFile(ownerId: string, fileId: string): Promise<string | null> {
    try {
      const metaDocRef = doc(db, "schools", ownerId, "files", fileId);
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
          const batch = writeBatch(db);
          
          // Meta verisini sil
          batch.delete(metaRef);

          if (data && data.type === 'chunked') {
              const totalChunks = data.totalChunks;
              for (let i = 0; i < totalChunks; i++) {
                  const chunkRef = doc(db, "schools", ownerId, "files", `${fileId}_${i}`);
                  batch.delete(chunkRef);
              }
          }
          
          await batch.commit();
      }
    } catch (error) {
      console.error("File delete error:", error);
    }
  }
};
