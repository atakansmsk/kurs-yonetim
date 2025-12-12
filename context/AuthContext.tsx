
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { AuthService } from '../services/api';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../firebaseConfig';

// Extend Type Definition locally if needed or rely on updated types
interface ExtendedAuthContextType extends AuthContextType {
    loginGuest: () => void;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 0.5 saniye zaman aşımı (Hızlı açılış)
    const timeout = setTimeout(() => {
        setLoading(false);
    }, 500);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || "Kullanıcı"
        });
      } else {
        // Eğer manuel olarak "Misafir" girişi yapılmadıysa null yap
        // (AuthService.loginGuest ile state güncelleniyor, burada ezmemek lazım)
        // Ancak onAuthStateChanged sadece Firebase çıkışlarında tetiklenir.
        // Misafir modunda burası null dönebilir, sorun yok.
      }
      setLoading(false);
    });

    return () => {
        unsubscribe();
        clearTimeout(timeout);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const userData = await AuthService.login(email, pass);
    if (userData && userData.id === 'local_user') {
        setUser(userData);
        return true;
    }
    return !!userData;
  };

  const loginGuest = async () => {
      const guestUser = await AuthService.loginGuest();
      setUser(guestUser);
  };

  const register = async (email: string, pass: string, name: string) => {
    const success = await AuthService.register(email, pass, name);
    return success;
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-400">Yükleniyor...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loginGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
