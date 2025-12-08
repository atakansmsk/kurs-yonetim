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

// --- DOSYA SERVİSİ (Hybrid Storage with Chunking) ---
// Dosyaları 'files' koleksiyonunda tutar. 1MB limitini aşan dosyaları parçalar.
const CHUNK_SIZE = 400000; // ~400KB (Mobil ağlar için daha güvenli)

export const FileService = {
  async saveFile(base64Data: string): Promise<string> {
    const fileId = Math.random().toString(36).substr(2, 12);
    const totalLength = base64Data.length;

    try {
      if (totalLength <= CHUNK_SIZE) {
        // Küçük dosya: Tek parça kaydet
        await setDoc(doc(db, "files", fileId), {
          content: base64Data,
          type: 'simple',
          createdAt: new Date().toISOString()
        });
      } else {
        // Büyük dosya: Parçalara böl
        const chunks: string[] = [];
        for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
            chunks.push(base64Data.substring(i, i + CHUNK_SIZE));
        }

        // Ana dosya (Meta verisi)
        await setDoc(doc(db, "files", fileId), {
          type: 'chunked',
          totalChunks: chunks.length,
          createdAt: new Date().toISOString()
        });

        // Parçaları kaydet - SIRALI (Sequential) Yükleme
        // Promise.all yerine for döngüsü kullanarak sırayla yüklüyoruz.
        // Bu, mobil bağlantılarda timeout hatalarını önler.
        for (let index = 0; index < chunks.length; index++) {
             await setDoc(doc(db, "files", `${fileId}_${index}`), {
                content: chunks[index],
                index: index
            });
        }
      }
      
      return fileId;
    } catch (error: any) {
      console.error("File save error:", error);
      throw new Error("Dosya kaydedilemedi. İnternet bağlantınızı kontrol edin.");
    }
  },

  async getFile(fileId: string): Promise<string | null> {
    try {
      const metaDocRef = doc(db, "files", fileId);
      const metaSnap = await getDoc(metaDocRef);

      if (!metaSnap.exists()) return null;

      const data = metaSnap.data();

      // Parçalı dosya ise birleştir
      if (data.type === 'chunked') {
          const totalChunks = data.totalChunks;
          
          // Okurken paralel çekebiliriz (Okuma hızı genelde yazmadan iyidir)
          // Ama garanti olsun diye yine sıralı çekim yapılabilir veya Promise.all kullanılabilir.
          // Okuma için Promise.all genellikle sorun yaratmaz.
          const chunkPromises = [];
          for (let i = 0; i < totalChunks; i++) {
              chunkPromises.push(getDoc(doc(db, "files", `${fileId}_${i}`)));
          }
          
          const chunkSnaps = await Promise.all(chunkPromises);
          let fullContent = "";
          
          // Parçaları sırayla ekle
          for (let i = 0; i < totalChunks; i++) {
             const snap = chunkSnaps[i];
             if (snap.exists()) {
                 fullContent += snap.data().content;
             } else {
                 console.error(`Eksik parça: ${i}`);
                 throw new Error("Dosya parçaları eksik.");
             }
          }
          return fullContent;
      } else {
          // Basit (Küçük) Dosya veya Eski Format
          return data.content || null;
      }
    } catch (error) {
      console.error("File fetch error:", error);
      return null;
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    try {
      const metaRef = doc(db, "files", fileId);
      const metaSnap = await getDoc(metaRef);
      
      if (metaSnap.exists()) {
          const data = metaSnap.data();
          await deleteDoc(metaRef); // Ana dosyayı sil

          // Parçalıysa alt parçaları da sil
          if (data.type === 'chunked') {
              const totalChunks = data.totalChunks;
              const deletePromises = [];
              for (let i = 0; i < totalChunks; i++) {
                  deletePromises.push(deleteDoc(doc(db, "files", `${fileId}_${i}`)));
              }
              await Promise.all(deletePromises);
          }
      }
    } catch (error) {
      console.error("File delete error:", error);
    }
  }
};