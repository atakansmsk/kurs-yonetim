
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { AuthService } from '../services/api';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../firebaseConfig';

// Extend Type Definition locally
interface ExtendedAuthContextType extends AuthContextType {
    loginGuest: () => void;
    hasConnectionIssue: boolean;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasConnectionIssue, setHasConnectionIssue] = useState(false);

  useEffect(() => {
    // 6 saniye içinde Firebase yanıt vermezse bağlantı sorunu olduğunu varsay
    const connectionTimeout = setTimeout(() => {
        if (loading) {
            console.warn("Firebase bağlantısı zaman aşımına uğradı. Ağ kısıtlaması olabilir.");
            setHasConnectionIssue(true);
            setLoading(false);
        }
    }, 6000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(connectionTimeout);
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || "Kullanıcı"
        });
        setHasConnectionIssue(false);
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Auth state error:", error);
        setHasConnectionIssue(true);
        setLoading(false);
    });

    return () => {
        unsubscribe();
        clearTimeout(connectionTimeout);
    };
  }, [loading]);

  const login = async (email: string, pass: string) => {
    try {
        const userData = await AuthService.login(email, pass);
        if (userData) {
            setUser(userData);
            setHasConnectionIssue(false);
            return true;
        }
        return false;
    } catch (e) {
        setHasConnectionIssue(true);
        return false;
    }
  };

  const loginGuest = async () => {
      const guestUser = await AuthService.loginGuest();
      setUser(guestUser);
      setHasConnectionIssue(false);
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
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <div className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">VERİLER SENKRONİZE EDİLİYOR...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loginGuest, hasConnectionIssue }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
