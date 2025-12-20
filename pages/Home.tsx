
import React, { useState, useRef, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, Palette, Music, BookOpen, Trophy, 
  Activity, UserPlus, ImagePlus, Users, LogOut, Settings, 
  Zap, CalendarRange, ChevronRight, 
  Plus, Clock, MessageCircle, AlertTriangle,
  TrendingUp, Wallet, ListChecks, Building2, PencilLine
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

const COLOR_GRADIENTS: Record<string, string> = {
  indigo: 'from-indigo-600 to-indigo-700',
  rose: 'from-rose-500 to-rose-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  cyan: 'from-cyan-500 to-cyan-600',
  purple: 'from-purple-600 to-purple-700',
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state, actions } = useCourse();
  const { logout, user } = useAuth();
  
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayName = useMemo((): WeekDay => {
    const map: Record<number, WeekDay> = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt" };
    return map[now.getDay()];
  }, [now]);

  const dashboardData = useMemo(() => {
    const todayKey = `${state.currentTeacher}|${todayName}`;
    const todaySlots = state.schedule[todayKey] || [];
    const activeSlots = todaySlots.filter(s => s.studentId);
    const sortedSlots = [...activeSlots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    const completedCount = sortedSlots.filter(s => timeToMinutes(s.end) < currentMinutes).length;
    const totalCount = sortedSlots.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const nextSlot = sortedSlots.find(s => timeToMinutes(s.start) > currentMinutes - 10);
    const nextStudent = nextSlot ? state.students[nextSlot.studentId!] : null;

    const unpaidCount = Object.values(state.students).filter((s: Student) => {
        if (!s.isActive || s.fee <= 0) return false;
        const thisMonthPayments = (s.history || []).filter(tx => {
            if (tx.isDebt) return false;
            const d = new Date(tx.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const totalPaid = thisMonthPayments.reduce((acc, curr) => acc + curr.amount, 0);
        return totalPaid < s.fee;
    }).length;

    return { totalCount, completedCount, progressPercent, nextSlot, nextStudent, unpaidCount };
  }, [state.schedule, state.students, state.currentTeacher, todayName, currentMinutes]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        actions.updateSchoolIcon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isCustomLogo = state.schoolIcon.startsWith('data:');
  const CurrentIcon = !isCustomLogo ? (ICONS[state.schoolIcon] || Sparkles) : Sparkles;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-6 pt-10 pb-32 no-scrollbar">
      
      {/* 1. Ultra-Clean Header */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Merhaba, {user?.name.split(' ')[0]}</h1>
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-2">
                {dashboardData.totalCount > 0 ? `BUGÜN ${dashboardData.totalCount} DERSİNİZ VAR` : 'BUGÜN DERSİNİZ YOK'}
             </p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-soft hover:text-indigo-600 active:scale-95 transition-all"
          >
            <Settings size={22} />
          </button>
      </div>

      {/* 2. Progress Strip */}
      {dashboardData.totalCount > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
             <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNLÜK İLERLEME</span>
                <span className="text-xs font-black text-indigo-600">%{Math.round(dashboardData.progressPercent)}</span>
             </div>
             <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                    style={{ width: `${dashboardData.progressPercent}%` }}
                />
             </div>
          </div>
      )}

      {/* 3. Hero Component - Only prominent if next lesson exists */}
      {dashboardData.nextSlot && dashboardData.nextStudent && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div 
                onClick={() => onNavigate('SCHEDULE')}
                className={`relative overflow-hidden rounded-[2.5rem] p-6 text-white shadow-2xl shadow-indigo-100 cursor-pointer active:scale-[0.98] transition-all bg-gradient-to-br ${COLOR_GRADIENTS[dashboardData.nextStudent.color || 'indigo']}`}
              >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  
                  <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                          <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-1.5">
                              <Zap size={12} fill="currentColor" />
                              <span className="text-[9px] font-black uppercase tracking-widest">SIRADAKİ ÖĞRENCİ</span>
                          </div>
                          <div className="text-sm font-black flex items-center gap-1.5">
                              <Clock size={16} strokeWidth={3} />
                              {dashboardData.nextSlot.start}
                          </div>
                      </div>

                      <div className="mb-6">
                          <h2 className="text-3xl font-black tracking-tight mb-1">{dashboardData.nextStudent.name}</h2>
                          {dashboardData.nextStudent.nextLessonNote && (
                              <div className="flex items-center gap-1.5 text-white/90">
                                  <AlertTriangle size={14} fill="currentColor" className="text-white" />
                                  <p className="text-xs font-bold italic truncate max-w-[240px]">{dashboardData.nextStudent.nextLessonNote}</p>
                              </div>
                          )}
                      </div>

                      <div className="flex items-center justify-between">
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const phone = dashboardData.nextStudent?.phone.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/90${phone}`, '_blank');
                            }}
                            className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                          >
                              <MessageCircle size={16} fill="currentColor" /> WhatsApp
                          </button>
                          <div className="text-[10px] font-black opacity-80 uppercase tracking-widest">
                             {dashboardData.totalCount - dashboardData.completedCount} DERS KALDI
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 4. Bento Grid Menu - Focus on Schedule */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4 ml-2">YÖNETİM</h3>
      <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          {/* Main Card: Daily Schedule (Bugünkü Liste) */}
          <button 
            onClick={() => onNavigate('SCHEDULE')}
            className="col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex items-center justify-between group hover:border-indigo-200 transition-all active:scale-[0.99]"
          >
              <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <ListChecks size={28} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                      <h4 className="font-black text-lg text-slate-800">Bugünkü Dersler</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{dashboardData.totalCount} Planlanmış Saat</p>
                  </div>
              </div>
              <ChevronRight size={20} className="text-slate-200 group-hover:text-indigo-400 transition-all" />
          </button>

          {/* Students Square */}
          <button 
            onClick={() => onNavigate('STUDENTS')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group hover:border-emerald-200 transition-all active:scale-[0.98] relative"
          >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Users size={24} />
              </div>
              <div className="text-left">
                  <h4 className="font-black text-slate-800 text-base leading-tight">Öğrenciler</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{Object.keys(state.students).length} Kayıtlı</p>
              </div>
              {dashboardData.unpaidCount > 0 && (
                <div className="absolute top-6 right-6 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {dashboardData.unpaidCount}
                </div>
              )}
          </button>

          {/* Weekly View (Finans yerine Haftalık Görünüm) */}
          <button 
            onClick={() => onNavigate('WEEKLY')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group hover:border-amber-200 transition-all active:scale-[0.98]"
          >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <CalendarRange size={24} />
              </div>
              <div className="text-left">
                  <h4 className="font-black text-slate-800 text-base leading-tight">Haftalık</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Genel Plan</p>
              </div>
          </button>
          
          {/* Quick Stats Summary Strip */}
          <div className="col-span-2 bg-slate-900 rounded-[2.2rem] p-5 flex items-center justify-between shadow-xl shadow-slate-200">
                <div className="flex flex-col items-center flex-1 border-r border-slate-700">
                    <span className="text-lg font-black text-white">{state.teachers.length}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">EĞİTMEN</span>
                </div>
                <div className="flex flex-col items-center flex-1 border-r border-slate-700">
                    <span className="text-lg font-black text-white">{dashboardData.totalCount}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">BUGÜN</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                    <button onClick={() => onNavigate('WEEKLY')} className="flex flex-col items-center">
                        <TrendingUp size={16} className="text-indigo-400 mb-1" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">FİNANS</span>
                    </button>
                </div>
          </div>
      </div>

      {/* Quick Actions Floating Button */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
          {isQuickActionOpen && (
              <div className="flex flex-col gap-3 animate-slide-up origin-bottom">
                  <button 
                    onClick={() => { onNavigate('STUDENTS'); setIsQuickActionOpen(false); }}
                    className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100 group active:scale-95 transition-all"
                  >
                      <span className="text-xs font-black text-slate-700">Öğrenci Ekle</span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <UserPlus size={18} />
                      </div>
                  </button>
                  <button 
                    onClick={() => { onNavigate('SCHEDULE'); setIsQuickActionOpen(false); }}
                    className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100 group active:scale-95 transition-all"
                  >
                      <span className="text-xs font-black text-slate-700">Ders Saati Aç</span>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Plus size={18} />
                      </div>
                  </button>
              </div>
          )}
          <button 
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className={`w-14 h-14 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl shadow-slate-400 transition-all active:scale-90 ${isQuickActionOpen ? 'rotate-45 bg-rose-500' : ''}`}
          >
              <Plus size={32} strokeWidth={2.5} />
          </button>
      </div>

      {/* Settings Modal - Redesigned to include Branding */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
             {/* Profile Info */}
             <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-indigo-600 border border-slate-200 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">{user?.name}</h3>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
             </div>

            {/* NEW: Branding Section */}
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">KURUMSAL AYARLAR</h4>
                 <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                {isCustomLogo ? <img src={state.schoolIcon} className="w-full h-full object-contain" /> : <CurrentIcon size={16} className="text-indigo-600" />}
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold text-slate-800">{state.schoolName}</p>
                                <p className="text-[9px] text-slate-400">Logo ve isim düzenle</p>
                            </div>
                        </div>
                        <PencilLine size={16} className="text-slate-300" />
                    </button>
                 </div>
            </div>

            {/* Tema Rengi Seçimi */}
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">UYGULAMA TEMASI</h4>
                 <div className="flex gap-3 justify-center flex-wrap">
                    {['indigo', 'blue', 'emerald', 'violet', 'rose', 'amber', 'neutral'].map(t => (
                        <button 
                            key={t} 
                            onClick={() => actions.updateThemeColor(t)}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${state.themeColor === t ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: t === 'neutral' ? '#334155' : (t === 'indigo' ? '#4f46e5' : (t === 'blue' ? '#0284c7' : (t === 'emerald' ? '#059669' : (t === 'violet' ? '#7c3aed' : (t === 'rose' ? '#e11d48' : '#d97706'))))) }}
                        />
                    ))}
                 </div>
            </div>

            {/* Otomatik Ders Toggle */}
            <button onClick={actions.toggleAutoProcessing} className={`p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${state.autoLessonProcessing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-500 text-white shadow-glow-colored shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'}`}>
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-bold text-sm ${state.autoLessonProcessing ? 'text-indigo-900' : 'text-slate-700'}`}>Otomatik İşleme</h4>
                        <p className="text-[10px] opacity-70 leading-tight mt-0.5">Dersler bittiğinde borçlandır.</p>
                    </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${state.autoLessonProcessing ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
            </button>
            
            <button onClick={logout} className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-2 font-bold text-sm hover:bg-red-100 transition-colors">
                <LogOut size={18} /> Oturumu Kapat
            </button>
        </div>
      </Dialog>

      {/* Independent Branding Modal (Called from Settings) */}
      <Dialog isOpen={isBrandingModalOpen} onClose={() => setIsBrandingModalOpen(false)} title="Kurumsal Kimlik">
        <div className="flex flex-col gap-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">OKUL / KURUM ADI</label>
                <input 
                    type="text" 
                    value={state.schoolName} 
                    onChange={(e) => actions.updateSchoolName(e.target.value)}
                    placeholder="Sanat Akademisi..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">LOGO SEÇİMİ</label>
                <div className="grid grid-cols-4 gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="col-span-4 py-8 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-400 bg-indigo-50/30 hover:bg-indigo-50 transition-all">
                        <ImagePlus size={32} />
                        <span className="text-[10px] font-black uppercase tracking-wide">ÖZEL LOGO YÜKLE</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    {Object.keys(ICONS).map((key) => {
                        const Icon = ICONS[key];
                        return (
                        <button key={key} onClick={() => { actions.updateSchoolIcon(key); }} className={`aspect-square flex items-center justify-center rounded-2xl border transition-all ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                            <Icon size={24} strokeWidth={1.5} />
                        </button>
                        );
                    })}
                </div>
             </div>
             <button 
                onClick={() => setIsBrandingModalOpen(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest mt-2 active:scale-[0.98] transition-all"
             >
                Kaydet ve Kapat
             </button>
        </div>
      </Dialog>
    </div>
  );
};
