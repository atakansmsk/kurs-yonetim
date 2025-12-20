
import React, { useState, useRef, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, Palette, Music, BookOpen, Trophy, 
  Activity, UserPlus, ImagePlus, Users, LogOut, Settings, 
  Zap, CalendarRange, 
  Plus, Clock, 
  TrendingUp, Building2, PencilLine,
  Search, CalendarCheck, CreditCard, CheckCircle2,
  Coffee, Droplets, PartyPopper, ListChecks
} from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { WeekDay, Student } from '../types';

interface HomeProps {
  onNavigate: (tab: 'SCHEDULE' | 'STUDENTS' | 'WEEKLY') => void;
}

const ICONS: Record<string, React.ElementType> = {
  'sparkles': Sparkles,
  'palette': Palette,
  'music': Music,
  'book': BookOpen,
  'trophy': Trophy,
  'activity': Activity
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state, actions } = useCourse();
  const { logout, user } = useAuth();
  
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 5) return "İyi Geceler";
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi Günler";
    return "İyi Akşamlar";
  };

  const isCustomLogo = state.schoolIcon.startsWith('data:');
  const CurrentIcon = !isCustomLogo ? (ICONS[state.schoolIcon] || Sparkles) : Sparkles;

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { actions.updateSchoolIcon(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-6 pt-10 pb-32 no-scrollbar">
      
      {/* 1. Header Area */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
               {getGreeting()}, {user?.name.split(' ')[0]}
             </h1>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                {state.schoolName} Hoş Geldiniz
             </p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-soft hover:text-indigo-600 active:scale-95 transition-all">
            <Settings size={22} />
          </button>
      </div>

      {/* 2. Navigation Bento Grid */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] mb-4 ml-2">NAVİGASYON</h3>
      <div className="grid grid-cols-2 gap-4 animate-slide-up">
          
          <button 
            onClick={() => onNavigate('SCHEDULE')}
            className="col-span-2 bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex items-center justify-between group active:scale-[0.98] relative overflow-hidden"
          >
              <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex flex-col items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <ListChecks size={24} />
                  </div>
                  <div className="text-left">
                      <h4 className="font-black text-lg tracking-tight leading-tight">Günün Listesi</h4>
                      <p className="text-[10px] text-indigo-100 font-bold mt-1 uppercase tracking-widest">Programı Görüntüle</p>
                  </div>
              </div>
              <ChevronRight size={24} className="opacity-50" />
          </button>

          <button 
            onClick={() => onNavigate('STUDENTS')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group active:scale-[0.98] relative overflow-hidden"
          >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                  <Users size={24} />
              </div>
              <div className="text-left relative z-10">
                  <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">Öğrenciler</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{Object.keys(state.students).length} Kayıt</p>
              </div>
          </button>

          <button 
            onClick={() => onNavigate('WEEKLY')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group active:scale-[0.98]"
          >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                  <CalendarRange size={24} />
              </div>
              <div className="text-left">
                  <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">Haftalık</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Plan & Finans</p>
              </div>
          </button>
      </div>

      {/* Settings Modal */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
             <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-white flex items-center justify-center text-xl font-bold text-white shadow-xl">{user?.name.charAt(0).toUpperCase()}</div>
                <div>
                    <h3 className="font-black text-slate-900 leading-none">{user?.name}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1.5">{user?.email}</p>
                </div>
             </div>
            <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">KURUMSAL AYARLAR</h4>
                 <button onClick={() => setIsBrandingModalOpen(true)} className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                            {isCustomLogo ? <img src={state.schoolIcon} className="w-full h-full object-contain" /> : <CurrentIcon size={20} className="text-indigo-600" />}
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black text-slate-800 leading-none">{state.schoolName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Kimlik Düzenle</p>
                        </div>
                    </div>
                    <PencilLine size={18} className="text-slate-300" />
                 </button>
            </div>
            <button onClick={logout} className="p-5 mt-4 rounded-[1.5rem] border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"><LogOut size={20} /> OTURUMU KAPAT</button>
        </div>
      </Dialog>

      <Dialog isOpen={isBrandingModalOpen} onClose={() => setIsBrandingModalOpen(false)} title="Kurumsal Kimlik">
        <div className="flex flex-col gap-6 pt-2">
             <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">KURUM ADI</label>
                <input type="text" value={state.schoolName} onChange={(e) => actions.updateSchoolName(e.target.value)} placeholder="Akademi Adı..." className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all" />
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block ml-1">LOGO SEÇİMİ</label>
                <div className="grid grid-cols-4 gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="col-span-4 py-10 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-indigo-200 text-indigo-400 bg-indigo-50/20 group">
                        <ImagePlus size={36} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">ÖZEL LOGO YÜKLE</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    {Object.keys(ICONS).map((key) => {
                        const Icon = ICONS[key];
                        return (
                        <button key={key} onClick={() => { actions.updateSchoolIcon(key); }} className={`aspect-square flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg scale-105' : 'border-slate-100 text-slate-300 bg-white'}`}><Icon size={28} strokeWidth={1.5} /></button>
                        );
                    })}
                </div>
             </div>
             <button onClick={() => setIsBrandingModalOpen(false)} className="w-full py-5 bg-slate-900 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.25em] mt-4 shadow-xl active:scale-[0.98] transition-all">KAYDET VE KAPAT</button>
        </div>
      </Dialog>
    </div>
  );
};

const ChevronRight = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6"/>
    </svg>
);
