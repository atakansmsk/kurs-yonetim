import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { AuthService } from '../services/api';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../firebaseConfig';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Güvenlik: Eğer Firebase 2 saniye içinde yanıt vermezse yüklemeyi bitir (Offline/Slow Network durumları için)
    const timeout = setTimeout(() => {
        setLoading(false);
    }, 2000);

    // Firebase Auth Durum Dinleyicisi
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout); // Bağlantı başarılıysa zamanlayıcıyı iptal et
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || "Kullanıcı"
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Component unmount olduğunda dinleyiciyi kaldır
    return () => {
        unsubscribe();
        clearTimeout(timeout);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const userData = await AuthService.login(email, pass);
    // Not: setUser yapmamıza gerek yok, onAuthStateChanged tetiklenecek
    return !!userData;
  };

  const register = async (email: string, pass: string, name: string) => {
    const success = await AuthService.register(email, pass, name);
    return success;
  };

  const logout = () => {
    AuthService.logout();
  };

  // İlk yüklemede kullanıcı durumu kontrol edilirken boş ekran gösterilebilir
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-400">Yükleniyor...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};