
import React, { useState, useRef, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, Palette, Music, BookOpen, Trophy, 
  Activity, UserPlus, ImagePlus, Users, LogOut, Settings, 
  Zap, CalendarRange, ChevronRight, 
  Plus, Clock, MessageCircle, AlertTriangle,
  TrendingUp, Wallet, ListChecks, Building2, PencilLine,
  Search, CalendarCheck, CreditCard, Star, CheckCircle2,
  Coffee, Droplets, PartyPopper
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
  active: 'from-indigo-600 to-indigo-700 shadow-indigo-500/20',
  break: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
  success: 'from-slate-800 to-slate-900 shadow-slate-400/20',
  done: 'from-purple-600 to-purple-700 shadow-purple-500/20',
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
    if (hour < 5) return "İyi Geceler";
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi Günler";
    return "İyi Akşamlar";
  };

  const todayName = useMemo((): WeekDay => {
    const map: Record<number, WeekDay> = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt" };
    return map[now.getDay()];
  }, [now]);

  const smartData = useMemo(() => {
    const todayKey = `${state.currentTeacher}|${todayName}`;
    const todaySlots = state.schedule[todayKey] || [];
    const activeSlots = todaySlots.filter(s => s.studentId);
    const sortedSlots = [...activeSlots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    
    // 1. Current Lesson?
    const currentLesson = sortedSlots.find(s => currentMinutes >= timeToMinutes(s.start) && currentMinutes <= timeToMinutes(s.end));
    
    // 2. Just Finished? (Last 10 minutes)
    const recentlyFinished = sortedSlots.filter(s => currentMinutes > timeToMinutes(s.end) && currentMinutes <= timeToMinutes(s.end) + 10)
                                      .sort((a,b) => timeToMinutes(b.end) - timeToMinutes(a.end))[0];

    // 3. Next Lesson?
    const upcomingLesson = sortedSlots.find(s => currentMinutes < timeToMinutes(s.start));

    // 4. Gap Calculation
    let gapMinutes = 0;
    if (upcomingLesson) {
        const lastEnd = recentlyFinished ? timeToMinutes(recentlyFinished.end) : currentMinutes;
        gapMinutes = timeToMinutes(upcomingLesson.start) - currentMinutes;
    }

    const totalCount = sortedSlots.length;
    const completedCount = sortedSlots.filter(s => currentMinutes > timeToMinutes(s.end)).length;

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

    return { currentLesson, recentlyFinished, upcomingLesson, gapMinutes, totalCount, completedCount, unpaidCount };
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

  const renderSmartHub = () => {
    const { currentLesson, recentlyFinished, upcomingLesson, gapMinutes, totalCount, completedCount } = smartData;

    // CASE 1: Active Lesson
    if (currentLesson) {
        const student = state.students[currentLesson.studentId!];
        return (
            <div className={`group relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl animate-slide-up bg-gradient-to-br ${COLOR_GRADIENTS.active}`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 bg-white/20 w-fit px-3 py-1 rounded-full border border-white/20">
                        <Activity size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">ŞU AN DERSTESİNİZ</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-2">{student?.name}</h2>
                    <div className="flex items-center gap-2 text-indigo-100 font-bold mb-8">
                        <Clock size={16} />
                        <span>{currentLesson.start} - {currentLesson.end}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-[11px] font-black uppercase tracking-widest opacity-80">
                           Derse Odaklanma Zamanı
                        </div>
                        <CheckCircle2 size={24} className="opacity-40" />
                    </div>
                </div>
            </div>
        );
    }

    // CASE 2: Just Finished (Confirmation)
    if (recentlyFinished) {
        const student = state.students[recentlyFinished.studentId!];
        return (
            <div className={`group relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl animate-slide-up bg-gradient-to-br ${COLOR_GRADIENTS.break}`}>
                <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                        <CheckCircle2 size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight mb-1">{student?.name} Dersi Tamamlandı</h2>
                    <p className="text-xs font-bold text-emerald-50 opacity-90 uppercase tracking-widest mb-6">OTOMATİK OLARAK KAYDEDİLDİ</p>
                    
                    {upcomingLesson ? (
                        <div className="bg-black/10 px-6 py-3 rounded-2xl border border-white/10 w-full flex items-center justify-center gap-3">
                            <Clock size={16} />
                            <span className="text-sm font-bold">Sıradaki Ders: {upcomingLesson.start}</span>
                        </div>
                    ) : (
                        <p className="text-xs font-bold opacity-70 italic">Günü harika tamamladın!</p>
                    )}
                </div>
            </div>
        );
    }

    // CASE 3: Gap / Break Time
    if (upcomingLesson && gapMinutes > 5) {
        const student = state.students[upcomingLesson.studentId!];
        const isCoffeeTime = gapMinutes >= 15;
        return (
            <div className={`group relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl animate-slide-up bg-gradient-to-br ${isCoffeeTime ? COLOR_GRADIENTS.break : COLOR_GRADIENTS.active}`}>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            {isCoffeeTime ? <Coffee size={28} /> : <Droplets size={28} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-none">{gapMinutes} Dakika Ara</h2>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1.5">
                                {isCoffeeTime ? "Kahve & Dinlenme Zamanı" : "Su İçmeyi Unutmayın"}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">SIRADAKİ DERSİNİZ</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight">{student?.name}</h3>
                            <span className="text-lg font-black tracking-tighter bg-white text-emerald-600 px-3 py-1 rounded-xl shadow-lg">
                                {upcomingLesson.start}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // CASE 4: Day Finished
    if (totalCount > 0 && completedCount === totalCount) {
        return (
            <div className={`group relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl animate-slide-up bg-gradient-to-br ${COLOR_GRADIENTS.done}`}>
                <div className="relative z-10 flex flex-col items-center text-center py-4">
                    <PartyPopper size={56} className="mb-4 text-purple-200" />
                    <h2 className="text-2xl font-black tracking-tight mb-2">Günün Sonu!</h2>
                    <p className="text-sm font-bold text-purple-100 opacity-80 max-w-[200px] leading-relaxed">
                        Bugün toplam {totalCount} dersi başarıyla tamamladınız. Dinlenme zamanı!
                    </p>
                    <button 
                        onClick={() => onNavigate('SCHEDULE')}
                        className="mt-8 px-8 py-4 bg-white text-purple-700 rounded-2xl text-[11px] font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest"
                    >
                        Günün Derslerine Göz At
                    </button>
                </div>
            </div>
        );
    }

    // CASE 5: Empty Day
    return (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-slide-up">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 border border-slate-100 shadow-soft">
                <Building2 size={40} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Bugün Program Boş</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">YENİ DERSLER EKLEYEREK BAŞLAYIN</p>
            <button onClick={() => onNavigate('SCHEDULE')} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black shadow-xl shadow-slate-200 active:scale-95 transition-all">SAATLERİ DÜZENLE</button>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-6 pt-12 pb-32 no-scrollbar">
      
      {/* 1. Clean Header */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
               {getGreeting()}, {user?.name.split(' ')[0]}
             </h1>
             <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                   {smartData.totalCount > 0 
                    ? `PROGRAMINIZDA ${smartData.totalCount} DERS VAR` 
                    : 'BUGÜN İÇİN PLANLI DERS YOK'}
                </p>
             </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-soft hover:text-indigo-600 active:scale-95 transition-all"
          >
            <Settings size={22} />
          </button>
      </div>

      {/* 2. Smart Hub Hero Section */}
      <div className="mb-10">
          {renderSmartHub()}
      </div>

      {/* 3. Action Strip */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar mb-10 animate-slide-up px-1">
          <button onClick={() => onNavigate('STUDENTS')} className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-95 shrink-0 hover:border-indigo-200 group">
            <Search size={16} className="text-slate-400 group-hover:text-indigo-500" />
            <span className="text-xs font-bold text-slate-600">Öğrenci Ara</span>
          </button>
          <button onClick={() => onNavigate('SCHEDULE')} className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-95 shrink-0 hover:border-emerald-200 group">
            <CalendarCheck size={16} className="text-slate-400 group-hover:text-emerald-500" />
            <span className="text-xs font-bold text-slate-600">Yoklama</span>
          </button>
          <button onClick={() => onNavigate('WEEKLY')} className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-95 shrink-0 hover:border-amber-200 group">
            <CreditCard size={16} className="text-slate-400 group-hover:text-amber-500" />
            <span className="text-xs font-bold text-slate-600">Ödemeler</span>
          </button>
      </div>

      {/* 4. Bento Grid Nav */}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] mb-4 ml-2">NAVİGASYON</h3>
      <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          
          <button 
            onClick={() => onNavigate('STUDENTS')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group hover:border-emerald-200 transition-all active:scale-[0.98] relative overflow-hidden"
          >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
                  <Users size={24} />
              </div>
              <div className="text-left relative z-10">
                  <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">Öğrenciler</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                    {Object.keys(state.students).length} Kayıt
                  </p>
              </div>
              {smartData.unpaidCount > 0 && (
                <div className="absolute top-6 right-6 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    {smartData.unpaidCount}
                </div>
              )}
          </button>

          <button 
            onClick={() => onNavigate('WEEKLY')}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col items-start gap-5 group hover:border-amber-200 transition-all active:scale-[0.98]"
          >
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                  <CalendarRange size={24} />
              </div>
              <div className="text-left">
                  <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">Haftalık</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Genel Plan</p>
              </div>
          </button>
          
          <div className="col-span-2 bg-slate-900 rounded-[2.5rem] p-6 flex items-center justify-between shadow-2xl shadow-slate-300 overflow-hidden">
                <div className="flex flex-col items-center flex-1 border-r border-slate-800">
                    <span className="text-xl font-black text-white">{state.teachers.length}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">EĞİTMEN</span>
                </div>
                <div className="flex flex-col items-center flex-1 border-r border-slate-800">
                    <span className="text-xl font-black text-white">{smartData.totalCount}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">BUGÜN</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                    <button onClick={() => onNavigate('WEEKLY')} className="flex flex-col items-center group">
                        <TrendingUp size={20} className="text-indigo-400 mb-1 active:scale-90 transition-transform" />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">FİNANS</span>
                    </button>
                </div>
          </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
          {isQuickActionOpen && (
              <div className="flex flex-col gap-3 animate-slide-up origin-bottom">
                  <button 
                    onClick={() => { onNavigate('STUDENTS'); setIsQuickActionOpen(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-100 active:scale-95 transition-all"
                  >
                      <span className="text-xs font-black text-slate-700">Öğrenci Kaydı</span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                          <UserPlus size={18} />
                      </div>
                  </button>
                  <button 
                    onClick={() => { onNavigate('SCHEDULE'); setIsQuickActionOpen(false); }}
                    className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-100 active:scale-95 transition-all"
                  >
                      <span className="text-xs font-black text-slate-700">Saat Planla</span>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                          <Plus size={18} />
                      </div>
                  </button>
              </div>
          )}
          <button 
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className={`w-16 h-16 rounded-[1.75rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl shadow-slate-400 transition-all active:scale-90 ${isQuickActionOpen ? 'rotate-45 bg-rose-500 shadow-rose-200' : ''}`}
          >
              <Plus size={36} strokeWidth={3} />
          </button>
      </div>

      {/* Settings Modal */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
             <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-white flex items-center justify-center text-xl font-bold text-white shadow-xl">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 leading-none">{user?.name}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1.5">{user?.email}</p>
                </div>
             </div>

            <div className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">KURUMSAL AYARLAR</h4>
                 <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => setIsBrandingModalOpen(true)}
                        className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
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
                            className={`w-9 h-9 rounded-full border-2 transition-all active:scale-95 ${state.themeColor === t ? 'border-slate-800 shadow-lg scale-110' : 'border-transparent'}`}
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ders Bitince Borçlandır</p>
                    </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${state.autoLessonProcessing ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
            </button>
            
            <button onClick={logout} className="p-5 mt-4 rounded-[1.5rem] border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors active:scale-95">
                <LogOut size={20} /> OTURUMU KAPAT
            </button>
        </div>
      </Dialog>

      <Dialog isOpen={isBrandingModalOpen} onClose={() => setIsBrandingModalOpen(false)} title="Kurumsal Kimlik">
        <div className="flex flex-col gap-6 pt-2">
             <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">KURUM ADI</label>
                <input 
                    type="text" 
                    value={state.schoolName} 
                    onChange={(e) => actions.updateSchoolName(e.target.value)}
                    placeholder="Sanat Akademisi..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                />
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">LOGO SEÇİMİ</label>
                <div className="grid grid-cols-4 gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="col-span-4 py-10 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-indigo-200 text-indigo-400 bg-indigo-50/20 hover:bg-indigo-50 transition-all group">
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
                KAYDET VE KAPAT
             </button>
        </div>
      </Dialog>
    </div>
  );
};
