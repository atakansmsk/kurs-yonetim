
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, Palette, Music, BookOpen, Trophy, 
  Activity, UserPlus, ImagePlus, Users, LogOut, Settings, 
  Zap, CalendarRange, ChevronRight, 
  Plus, Clock, MessageCircle, AlertTriangle,
  TrendingUp, Wallet, ListChecks, Building2, PencilLine,
  Search, CalendarCheck, CreditCard, LayoutGrid
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
  indigo: 'from-indigo-600 to-indigo-700 shadow-indigo-200',
  rose: 'from-rose-500 to-rose-600 shadow-rose-200',
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
  amber: 'from-amber-500 to-amber-600 shadow-amber-200',
  cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-200',
  purple: 'from-purple-600 to-purple-700 shadow-purple-200',
};

const CircularProgress: React.FC<{ percent: number; size?: number }> = ({ percent, size = 56 }) => {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke="currentColor" strokeWidth="4" 
          fill="transparent" className="text-slate-100" 
        />
        <circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke="currentColor" strokeWidth="4" 
          fill="transparent" strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          className="text-indigo-600 transition-all duration-1000 ease-out" 
          strokeLinecap="round" 
        />
      </svg>
      <span className="absolute text-[10px] font-black text-slate-800">%{Math.round(percent)}</span>
    </div>
  );
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

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi Günler";
    return "İyi Akşamlar";
  };

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
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-6 pt-12 pb-32 no-scrollbar">
      
      {/* 1. Premium Header with Contextual Greeting */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
               {getGreeting()}, {user?.name.split(' ')[0]}
             </h1>
             <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-1">
                  {[1,2,3].map(i => <div key={i} className="w-4 h-4 rounded-full border border-white bg-slate-200" />)}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   {dashboardData.totalCount > 0 ? `${dashboardData.totalCount} DERSİNİZ VAR` : 'Bugün program boş'}
                </p>
             </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-soft hover:text-indigo-600 hover:shadow-indigo-100 active:scale-95 transition-all"
          >
            <Settings size={22} />
          </button>
      </div>

      {/* 2. World-Class Progress Overview */}
      <div className="mb-8 animate-slide-up bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-soft flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100/40 transition-colors"></div>
          <div className="flex flex-col gap-1 z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">GÜNLÜK ÖZET</span>
              <h4 className="text-lg font-black text-slate-800 tracking-tight">
                {dashboardData.completedCount} / {dashboardData.totalCount} Tamamlandı
              </h4>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {dashboardData.progressPercent >= 100 ? "Harika bir gün!" : "Verimlilik her şeydir."}
              </p>
          </div>
          <div className="z-10">
            <CircularProgress percent={dashboardData.progressPercent} size={64} />
          </div>
      </div>

      {/* 3. Action Strip - Minimalist & Efficient */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 animate-slide-up px-1">
          <button 
            onClick={() => onNavigate('STUDENTS')}
            className="flex items-center gap-2 bg-slate-100/50 hover:bg-white hover:shadow-sm px-4 py-2.5 rounded-2xl border border-transparent hover:border-slate-100 transition-all active:scale-95 shrink-0"
          >
            <Search size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Öğrenci Ara</span>
          </button>
          <button 
            onClick={() => onNavigate('SCHEDULE')}
            className="flex items-center gap-2 bg-slate-100/50 hover:bg-white hover:shadow-sm px-4 py-2.5 rounded-2xl border border-transparent hover:border-slate-100 transition-all active:scale-95 shrink-0"
          >
            <CalendarCheck size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Yoklama</span>
          </button>
          <button 
            onClick={() => onNavigate('WEEKLY')}
            className="flex items-center gap-2 bg-slate-100/50 hover:bg-white hover:shadow-sm px-4 py-2.5 rounded-2xl border border-transparent hover:border-slate-100 transition-all active:scale-95 shrink-0"
          >
            <CreditCard size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Ödemeler</span>
          </button>
      </div>

      {/* 4. Hero Card: Next Lesson Focus */}
      {dashboardData.nextSlot && dashboardData.nextStudent ? (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div 
                onClick={() => onNavigate('SCHEDULE')}
                className={`group relative overflow-hidden rounded-[2.5rem] p-7 text-white shadow-2xl active:scale-[0.98] transition-all bg-gradient-to-br ${COLOR_GRADIENTS[dashboardData.nextStudent.color || 'indigo']}`}
              >
                  {/* Glassmorph Overlays */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-[40px] -ml-10 -mb-10 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                          <div className="px-3.5 py-1.5 bg-white/15 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center gap-2 shadow-inner">
                              <Zap size={14} fill="currentColor" className="text-white" />
                              <span className="text-[10px] font-black uppercase tracking-[0.15em]"> SIRADAKİ </span>
                          </div>
                          <div className="flex items-center gap-2 text-white/90">
                              <Clock size={18} strokeWidth={2.5} />
                              <span className="text-base font-black tracking-tight">{dashboardData.nextSlot.start}</span>
                          </div>
                      </div>

                      <div className="mb-8">
                          <h2 className="text-3xl font-black tracking-tight mb-2 group-hover:translate-x-1 transition-transform">{dashboardData.nextStudent.name}</h2>
                          {dashboardData.nextStudent.nextLessonNote ? (
                              <div className="flex items-center gap-2 text-white/90 bg-white/10 p-2.5 rounded-xl border border-white/10">
                                  <AlertTriangle size={14} fill="currentColor" className="shrink-0" />
                                  <p className="text-[11px] font-bold leading-tight">{dashboardData.nextStudent.nextLessonNote}</p>
                              </div>
                          ) : (
                              <p className="text-xs font-medium text-white/60 tracking-wide">Program hazır, başarılar dileriz.</p>
                          )}
                      </div>

                      <div className="flex items-center justify-between">
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const phone = dashboardData.nextStudent?.phone.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/90${phone}`, '_blank');
                            }}
                            className="flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-[1.25rem] text-[11px] font-black shadow-xl hover:shadow-white/20 transition-all active:scale-95"
                          >
                              <MessageCircle size={16} fill="currentColor" /> WHATSAPP
                          </button>
                          <div className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest">
                             {dashboardData.totalCount - dashboardData.completedCount} DERS KALDI
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          /* Empty State - Motivational & Clean */
          <div className="mb-8 py-10 animate-slide-up flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 border border-slate-50 shadow-inner">
                 <Building2 size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Şu an dersiniz yok</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">HAZIRLIK İÇİN HARİKA BİR ZAMAN</p>
          </div>
      )}

      {/* 5. Bento Grid - Focused UI Hierarchy */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">NAVİGASYON</h3>
      <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          {/* Main List: Daily Schedule */}
          <button 
            onClick={() => onNavigate('SCHEDULE')}
            className="col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex items-center justify-between group hover:border-indigo-200 hover:shadow-glow-colored shadow-indigo-500/5 transition-all active:scale-[0.99]"
          >
              <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                      <ListChecks size={28} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                      <h4 className="font-black text-lg text-slate-800 tracking-tight">Günün Listesi</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">{dashboardData.totalCount} Planlanmış Seans</p>
                  </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <ChevronRight size={18} strokeWidth={2.5} />
              </div>
          </button>

          {/* Students Card */}
          <button 
            onClick={() => onNavigate('STUDENTS')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group hover:border-emerald-200 transition-all active:scale-[0.98] relative overflow-hidden"
          >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                  <Users size={24} />
              </div>
              <div className="text-left relative z-10">
                  <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">Öğrenciler</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                    {Object.keys(state.students).length} Kişi Kayıtlı
                  </p>
              </div>
              {dashboardData.unpaidCount > 0 && (
                <div className="absolute top-6 right-6 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    {dashboardData.unpaidCount}
                </div>
              )}
          </button>

          {/* Weekly Summary Card */}
          <button 
            onClick={() => onNavigate('WEEKLY')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group hover:border-amber-200 transition-all active:scale-[0.98]"
          >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                  <CalendarRange size={24} />
              </div>
              <div className="text-left">
                  <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">Takvim</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Haftalık Görünüm</p>
              </div>
          </button>
          
          {/* Detailed Stats Card Strip */}
          <div className="col-span-2 bg-slate-900 rounded-[2.5rem] p-6 flex items-center justify-between shadow-2xl shadow-slate-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -ml-12 -mt-12"></div>
                
                <div className="flex flex-col items-center flex-1 border-r border-slate-800">
                    <span className="text-xl font-black text-white">{state.teachers.length}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">EĞİTMEN</span>
                </div>
                <div className="flex flex-col items-center flex-1 border-r border-slate-800">
                    <span className="text-xl font-black text-white">{dashboardData.totalCount}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">BUGÜN</span>
                </div>
                <div className="flex flex-col items-center flex-1 group/stats">
                    <button onClick={() => onNavigate('WEEKLY')} className="flex flex-col items-center">
                        <TrendingUp size={18} className="text-indigo-400 mb-1 group-hover/stats:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">FİNANS</span>
                    </button>
                </div>
          </div>
      </div>

      {/* Floating Action Button with Glow */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
          {isQuickActionOpen && (
              <div className="flex flex-col gap-3 animate-slide-up origin-bottom">
                  <button 
                    onClick={() => { onNavigate('STUDENTS'); setIsQuickActionOpen(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-4 rounded-[1.5rem] shadow-2xl border border-slate-100 group active:scale-95 transition-all"
                  >
                      <span className="text-xs font-black text-slate-700">Öğrenci Kaydı</span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                          <UserPlus size={18} />
                      </div>
                  </button>
                  <button 
                    onClick={() => { onNavigate('SCHEDULE'); setIsQuickActionOpen(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-4 rounded-[1.5rem] shadow-2xl border border-slate-100 group active:scale-95 transition-all"
                  >
                      <span className="text-xs font-black text-slate-700">Yeni Ders Saati</span>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                          <Plus size={18} />
                      </div>
                  </button>
              </div>
          )}
          <button 
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className={`w-16 h-16 rounded-[1.75rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl shadow-slate-400 hover:shadow-slate-500/40 transition-all active:scale-90 ${isQuickActionOpen ? 'rotate-45 bg-rose-500 shadow-rose-200' : ''}`}
          >
              <Plus size={36} strokeWidth={3} />
          </button>
      </div>

      {/* Settings Modal (Same logic, refined UI) */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
             <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-white flex items-center justify-center text-xl font-bold text-white shadow-xl">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 leading-none">{user?.name}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">{user?.email}</p>
                </div>
             </div>

            <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">KURUMSAL AYARLAR</h4>
                 <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="flex items-center justify-between w-full p-3.5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                    >
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
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">UYGULAMA TEMASI</h4>
                 <div className="flex gap-3 justify-center flex-wrap">
                    {['indigo', 'blue', 'emerald', 'violet', 'rose', 'amber', 'neutral'].map(t => (
                        <button 
                            key={t} 
                            onClick={() => actions.updateThemeColor(t)}
                            className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${state.themeColor === t ? 'border-slate-800 shadow-lg scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: t === 'neutral' ? '#334155' : (t === 'indigo' ? '#4f46e5' : (t === 'blue' ? '#0284c7' : (t === 'emerald' ? '#059669' : (t === 'violet' ? '#7c3aed' : (t === 'rose' ? '#e11d48' : '#d97706'))))) }}
                        />
                    ))}
                 </div>
            </div>

            <button onClick={actions.toggleAutoProcessing} className={`p-5 rounded-[1.5rem] border flex items-center justify-between transition-all active:scale-95 ${state.autoLessonProcessing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 shadow-inner'}`}>
                        <Zap size={22} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-black text-sm tracking-tight ${state.autoLessonProcessing ? 'text-indigo-900' : 'text-slate-700'}`}>Otomatik İşleme</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ders Bitince Borçlandır</p>
                    </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${state.autoLessonProcessing ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
            </button>
            
            <button onClick={logout} className="p-5 mt-2 rounded-[1.5rem] border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-2 font-black text-sm hover:bg-red-100 transition-colors active:scale-95">
                <LogOut size={20} /> OTURUMU KAPAT
            </button>
        </div>
      </Dialog>

      <Dialog isOpen={isBrandingModalOpen} onClose={() => setIsBrandingModalOpen(false)} title="Kurumsal Kimlik">
        <div className="flex flex-col gap-6 pt-2">
             <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">OKUL / KURUM ADI</label>
                <input 
                    type="text" 
                    value={state.schoolName} 
                    onChange={(e) => actions.updateSchoolName(e.target.value)}
                    placeholder="Sanat Akademisi..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:shadow-glow-colored shadow-indigo-500/10 transition-all"
                />
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">LOGO SEÇİMİ</label>
                <div className="grid grid-cols-4 gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="col-span-4 py-10 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-indigo-200 text-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all group">
                        <ImagePlus size={36} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">ÖZEL LOGO YÜKLE</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    {Object.keys(ICONS).map((key) => {
                        const Icon = ICONS[key];
                        return (
                        <button 
                          key={key} 
                          onClick={() => { actions.updateSchoolIcon(key); }} 
                          className={`aspect-square flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100 scale-105' : 'border-slate-100 text-slate-300 hover:border-slate-200 bg-white'}`}
                        >
                            <Icon size={28} strokeWidth={1.5} />
                        </button>
                        );
                    })}
                </div>
             </div>
             <button 
                onClick={() => setIsBrandingModalOpen(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.25em] mt-4 shadow-xl active:scale-[0.98] transition-all"
             >
                Ayarları Kaydet
             </button>
        </div>
      </Dialog>
    </div>
  );
};
