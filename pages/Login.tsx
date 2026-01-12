
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, Mail, Sparkles, User, AlertCircle, WifiOff, HardDrive, Info, Globe } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, register, loginGuest, hasConnectionIssue } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !pass) {
        setError("Lütfen tüm alanları doldurun.");
        setLoading(false);
        return;
    }

    try {
        if (isRegister) {
            if (!name) { setError("İsim zorunludur."); setLoading(false); return; }
            const success = await register(email, pass, name);
            if (!success) setError("Kayıt sırasında bir sorun oluştu.");
        } else {
            const success = await login(email, pass);
            if (!success) setError("E-posta/şifre hatalı veya bağlantı yok.");
        }
    } catch (err) {
        setError("Sunucuya ulaşılamıyor. Lütfen internetinizi kontrol edin.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[60%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-200/50 border border-white relative animate-slide-up">
        
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4 transform rotate-3">
                <Sparkles size={32} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Kurs Pro</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">Eğitmen Yönetim Portalı</p>
        </div>

        {/* NETWORK WARNING FOR HOME WIFI ISSUES */}
        {hasConnectionIssue && (
            <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-tight mb-2">
                    <WifiOff size={16} /> Ağ Bağlantı Sorunu
                </div>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Ev Wi-Fi ağınız uygulama servislerini (Firebase/CDN) engelliyor olabilir. 
                    <br/><br/>
                    <strong className="block text-amber-900">• Çözüm 1:</strong> Wi-Fi yerine 4G/Mobil veri kullanın.
                    <strong className="block text-amber-900">• Çözüm 2:</strong> DNS ayarınızı <strong>8.8.8.8</strong> yapın.
                    <strong className="block text-amber-900">• Çözüm 3:</strong> Aşağıdaki <strong>"Çevrimdışı Kullan"</strong> butonunu seçin.
                </p>
            </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {isRegister && (
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <User size={20} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Adınız Soyadınız"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:font-medium"
                    />
                </div>
            )}

            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Mail size={20} />
                </div>
                <input 
                    type="email" 
                    placeholder="E-posta Adresi"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:font-medium"
                />
            </div>

            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Lock size={20} />
                </div>
                <input 
                    type="password" 
                    placeholder="Şifre"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:font-medium"
                />
            </div>

            {error && (
                <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-left-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 mt-1 bg-slate-900 text-white rounded-2xl font-bold text-base shadow-xl shadow-slate-300 hover:shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        {isRegister ? 'Ücretsiz Kayıt Ol' : 'Bulut Girişi Yap'}
                        <ArrowRight size={20} />
                    </>
                )}
            </button>
        </form>
        
        {/* LOCAL MODE BUTTON - HIGHLIGHTED DURING CONNECTION ISSUES */}
        <div className="mt-4 pt-4 border-t border-slate-100">
             <button 
                onClick={loginGuest}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                    hasConnectionIssue 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 animate-pulse' 
                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                }`}
             >
                 <HardDrive size={18} />
                 Kurulumsuz / Çevrimdışı Kullan
             </button>
             <p className="text-[9px] text-center text-slate-400 mt-2 font-medium">İnternetiniz yoksa veya kısıtlıysa bu modu kullanın.</p>
        </div>

        {/* Toggle */}
        <div className="mt-4 text-center">
            <p className="text-slate-400 text-sm font-medium">
                {isRegister ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}
                <button 
                    onClick={() => { setIsRegister(!isRegister); setError(""); }}
                    className="ml-2 text-indigo-600 font-black hover:underline"
                >
                    {isRegister ? "Giriş Yap" : "Hemen Kayıt Ol"}
                </button>
            </p>
        </div>

      </div>
      
      <div className="mt-6 text-center opacity-40">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-center">
            <Globe size={12} /> Bağlantı Durumu: {hasConnectionIssue ? 'Kısıtlı' : 'Aktif'}
        </p>
      </div>
    </div>
  );
};
