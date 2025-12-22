import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  CalendarRange,
  Sparkles, 
  Palette, 
  Music, 
  BookOpen, 
  Trophy, 
  Activity, 
  UserPlus, 
  Users, 
  LogOut, 
  Settings, 
  Zap, 
  GraduationCap, 
  ChevronRight, 
  ChevronLeft, 
  Share2, 
  AlertTriangle, 
  UploadCloud, 
  Loader2,
  Clock,
  Coffee,
  LayoutDashboard,
  Bell
} from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface HomeProps {
  onNavigate: (tab: 'SCHEDULE' | 'STUDENTS') => void;
}

const ICONS: Record<string, React.ElementType> = {
  'sparkles': Sparkles,
  'palette': Palette,
  'music': Music,
  'book': BookOpen,
  'trophy': Trophy,
  'activity': Activity
};

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state, actions, isRecovered } = useCourse();
  const { logout, user } = useAuth();
  
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isTeachersListOpen, setIsTeachersListOpen] = useState(false);
  const [isAddTeacherMode, setIsAddTeacherMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dayOffset, setDayOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const liveStatus = useMemo(() => {
    const jsDayToAppKey: Record<number, string> = {
        0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt"
    };
    const dayName = jsDayToAppKey[currentTime.getDay()];
    const key = `${state.currentTeacher}|${dayName}`;
    const todaysSlots = (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const currentSlot = todaysSlots.find(s => timeToMinutes(s.start) <= currentMins && timeToMinutes(s.end) > currentMins);
    const nextSlot = todaysSlots.find(s => timeToMinutes(s.start) > currentMins);

    let statusType: 'IN_LESSON' | 'BREAK' | 'IDLE' = 'IDLE';
    let timeLeft = 0;
    let progress = 0;

    if (currentSlot && currentSlot.studentId) {
        statusType = 'IN_LESSON';
        const start = timeToMinutes(currentSlot.start);
        const end = timeToMinutes(currentSlot.end);
        timeLeft = end - currentMins;
        progress = ((currentMins - start) / (end - start)) * 100;
    } else if (nextSlot) {
        statusType = 'BREAK';
        timeLeft = timeToMinutes(nextSlot.start) - currentMins;
    }

    return { statusType, currentSlot, nextSlot, timeLeft, progress };
  }, [state.schedule, state.currentTeacher, currentTime]);

  const dailyStats = useMemo(() => {
    const jsDayToAppKey: Record<number, string> = {
        0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt"
    };
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dayIndex = targetDate.getDay();
    const appDayKey = jsDayToAppKey[dayIndex];
    const key = `${state.currentTeacher}|${appDayKey}`;
    const count = (state.schedule[key] || []).filter(s => s.studentId).length;
    let label = appDayKey;
    if (dayOffset === 0) label = "Bugün";
    else if (dayOffset === 1) label = "Yarın";
    else if (dayOffset === -1) label = "Dün";
    return { count, label, fullDayName: appDayKey };
  }, [state.schedule, state.currentTeacher, dayOffset]);
  
  const getStudentCountForTeacher = (teacherName: string) => {
    const uniqueStudents = new Set<string>();
    Object.keys(state.schedule).forEach(key => {
        if (key.startsWith(`${teacherName}|`)) {
            state.schedule[key].forEach(slot => {
                if (slot.studentId) uniqueStudents.add(slot.studentId);
            });
        }
    });
    return uniqueStudents.size;
  };

  const currentTeacherStudentCount = useMemo(() => getStudentCountForTeacher(state.currentTeacher), [state.schedule, state.currentTeacher]);

  const handleSaveTeacher = () => {
    if (newTeacherName.trim()) {
      actions.addTeacher(newTeacherName.trim());
      setNewTeacherName("");
      setIsAddTeacherMode(false);
    }
  };

  const handleForceSync = async () => {
      setIsSyncing(true);
      try {
          await actions.forceSync();
      } catch (e) {
      } finally {
          setIsSyncing(false);
      }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        actions.updateSchoolIcon(reader.result as string);
        setIsLogoModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShareTeacherLink = (e: React.MouseEvent, teacherName: string) => {
      e.stopPropagation();
      if (!user) return;
      const baseUrl = window.location.origin + window.location.pathname;
      const url = `${baseUrl}?teacherView=true&uid=${user.id}&name=${encodeURIComponent(teacherName)}`;
      navigator.clipboard.writeText(url);
      alert(`Link Kopyalandı`);
  };

  const THEME_OPTIONS = [
    { key: 'indigo', color: '#4f46e5' },
    { key: 'blue', color: '#0284c7' },
    { key: 'emerald', color: '#059669' },
    { key: 'violet', color: '#7c3aed' },
    { key: 'rose', color: '#e11d48' },
    { key: 'amber', color: '#d97706' },
    { key: 'midnight', color: '#0f172a' },
    { key: 'carbon', color: '#171717' },
    { key: 'neutral', color: '#334155' },
  ];

  const userName = user?.name ? user.name.split(' ')[0] : "Eğitmen";

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-6 pt-6 pb-32 no-scrollbar scroll-smooth">
      
      {/* 1. Header Section */}
      <div className="flex items-start justify-between mb-8">
          <div className="flex flex-col">
             <div className="flex items-center gap-2 mb-2">
                <div className="px-2.5 py-1 bg-white border border-slate-100 rounded-lg shadow-sm flex items-center gap-1.5">
                    {state.schoolIcon.startsWith('data:') ? (
                        <img src={state.schoolIcon} alt="Logo" className="w-4 h-4 object-contain" />
                    ) : (
                        <Sparkles size={12} className="text-indigo-500" />
                    )}
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{state.schoolName}</span>
                </div>
             </div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                Merhaba, <br/> <span className="text-indigo-600">{userName}</span>
             </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className={`p-3 rounded-2xl border shadow-soft transition-all active:scale-90 relative ${isRecovered ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 border-slate-100'}`}>
                <Settings size={22} />
                {state.autoLessonProcessing && <div className="absolute top-3 right-3 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></div>}
            </button>
          </div>
      </div>

      {/* 2. LIVE FEED CARD */}
      <div className="w-full mb-8">
        <div className="relative overflow-hidden rounded-[2.5rem] p-7 shadow-2xl shadow-indigo-100 bg-slate-900 min-h-[160px]">
            {/* Gradients */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -ml-8 -mb-8"></div>
            
            <div className="relative z-10 flex flex-col h-full">
                {liveStatus.statusType === 'IN_LESSON' ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Canlı Ders</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{liveStatus.currentSlot?.start}</span>
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight truncate leading-none mb-3">{state.students[liveStatus.currentSlot!.studentId!]?.name}</h2>
                            <div className="flex items-center gap-3">
                                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                        style={{ width: `${liveStatus.progress}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-black text-indigo-300">{liveStatus.timeLeft} dk</span>
                            </div>
                        </div>
                    </div>
                ) : liveStatus.statusType === 'BREAK' ? (
                    <div className="flex flex-col items-center justify-center text-center py-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 mb-4">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight">Ders Arası</h3>
                        <p className="text-slate-400 text-xs mt-1">Sıradaki: <span className="text-indigo-300 font-bold">{state.students[liveStatus.nextSlot!.studentId!]?.name || "Boş"}</span></p>
                        <div className="mt-4 px-4 py-1.5 bg-indigo-600 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">
                           {liveStatus.timeLeft} dk kaldı
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                            <Coffee size={24} />
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight">Günün Sonu</h3>
                        <p className="text-slate-500 text-xs mt-1 font-medium tracking-wide">Tüm dersler tamamlandı.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 3. DASHBOARD GRID */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Total Students */}
          <div className="bg-white p-6 rounded-[2.2rem] shadow-soft border border-slate-50 flex flex-col justify-between h-40 group hover:border-indigo-100 transition-all">
             <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-100 group-hover:scale-110 transition-transform"><Users size={22} /></div>
             <div>
                <span className="text-4xl font-black text-slate-800 tracking-tighter block leading-none">{currentTeacherStudentCount}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-2">Öğrenciler</span>
             </div>
          </div>

          {/* Daily Schedule Navigation */}
          <div className="bg-white p-3 rounded-[2.2rem] shadow-soft border border-slate-50 flex flex-col h-40 group hover:border-indigo-100 transition-all">
             <div className="flex items-center justify-between mb-auto">
                <button onClick={() => setDayOffset(prev => prev - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"><ChevronLeft size={16} /></button>
                <button onClick={() => setDayOffset(prev => prev + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"><ChevronRight size={16} /></button>
             </div>
             
             <div className="flex flex-col items-center text-center pb-2">
                 <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{dailyStats.count}</span>
                 <div className="mt-2">
                     <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{dailyStats.label}</span>
                     {dailyStats.label !== dailyStats.fullDayName && (<span className="text-[8px] font-bold text-slate-300 uppercase">{dailyStats.fullDayName}</span>)}
                 </div>
             </div>
          </div>
      </div>

      {/* 4. MAIN ACTION BUTTON */}
      <div className="mb-8">
        <button 
            onClick={() => onNavigate('SCHEDULE')} 
            className="w-full bg-slate-900 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100 flex items-center justify-between group active:scale-[0.98] transition-all"
        >
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-all">
                    <CalendarRange size={28} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                    <h4 className="font-black text-lg text-white tracking-tight">Ders Programı</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Haftalık Takvim</p>
                </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <ChevronRight size={20} />
            </div>
        </button>
      </div>

      {/* 5. QUICK ACTIONS */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setIsTeachersListOpen(true)} className="bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-soft flex flex-col items-start gap-4 hover:border-orange-100 transition-all group">
             <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform"><GraduationCap size={20} /></div>
             <div className="text-left">
                <h4 className="font-black text-slate-800 text-sm">Eğitmenler</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Kadro Yönetimi</p>
             </div>
        </button>
         <button onClick={() => onNavigate('STUDENTS')} className="bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-soft flex flex-col items-start gap-4 hover:border-emerald-100 transition-all group">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform"><LayoutDashboard size={20} /></div>
             <div className="text-left">
                <h4 className="font-black text-slate-800 text-sm">Gelir Takibi</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Finansal Rapor</p>
             </div>
        </button>
      </div>

      {/* MODALS */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Eğitmen Ekle" : "Kadro"}
        actions={isAddTeacherMode ? (<><button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleSaveTeacher} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md">Ekle</button></>) : (<button onClick={() => setIsAddTeacherMode(true)} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest"><UserPlus size={16} /> Yeni Eğitmen</button>)}>
          {isAddTeacherMode ? (<div className="py-2"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 transition-all outline-none" placeholder="Ad Soyad..." autoFocus /></div>) : (<div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">{state.teachers.length === 0 ? <p className="text-center py-6 text-slate-400 font-bold text-xs">Eğitmen bulunamadı.</p> : state.teachers.map(teacher => {const count = getStudentCountForTeacher(teacher); return (<div key={teacher} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${teacher === state.currentTeacher ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div><div><div className="font-black text-slate-800 text-sm">{teacher}</div><div className="text-[10px] font-bold text-slate-400 mt-0.5">{count} Öğrenci</div></div></div><div className="flex items-center gap-2"><button onClick={(e) => handleShareTeacherLink(e, teacher)} className="p-2 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors"><Share2 size={16} /></button>{teacher !== state.currentTeacher && (<button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-black border border-slate-200 rounded-lg hover:border-indigo-600 transition-all uppercase tracking-wider">Seç</button>)}</div></div>);})}</div>)}
      </Dialog>

      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-6">
             <div className="flex items-center gap-4 bg-slate-900 p-5 rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black text-white">{user?.name ? user.name.charAt(0).toUpperCase() : 'E'}</div>
                <div className="z-10"><h3 className="font-black text-white text-lg tracking-tight">{user?.name || 'Eğitmen'}</h3><p className="text-xs text-slate-400 font-medium">{user?.email}</p></div>
             </div>

             <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-soft">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Okul Kimliği</h4>
                 <div className="flex items-center gap-5">
                     <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {state.schoolIcon.startsWith('data:') ? (
                            <img src={state.schoolIcon} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Sparkles size={24} className="text-slate-300" />
                        )}
                     </div>
                     <div className="flex flex-col gap-2 flex-1">
                         <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest">Logo Değiştir</button>
                         <button onClick={() => setIsLogoModalOpen(true)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest">İkon Seç</button>
                     </div>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
             </div>

            <div className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-soft">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tema Rengi</h4>
                 <div className="grid grid-cols-5 gap-3">
                    {THEME_OPTIONS.map(theme => (
                        <button key={theme.key} onClick={() => actions.updateThemeColor(theme.key)} className={`aspect-square rounded-xl border-4 transition-all ${state.themeColor === theme.key ? 'border-indigo-600 scale-105 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: theme.color }} />
                    ))}
                 </div>
            </div>

            <button onClick={actions.toggleAutoProcessing} className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all ${state.autoLessonProcessing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}><Zap size={24} fill="currentColor" /></div>
                    <div className="text-left"><h4 className={`font-black text-sm ${state.autoLessonProcessing ? 'text-indigo-900' : 'text-slate-700'}`}>Otomatik Takip</h4><p className="text-[10px] opacity-60 font-medium leading-tight mt-1">Ders bitiminde öğrencileri<br/>otomatik borçlandır.</p></div>
                </div>
                <div className={`w-14 h-8 rounded-full p-1.5 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${state.autoLessonProcessing ? 'translate-x-6' : 'translate-x-0'}`}></div></div>
            </button>
            <button onClick={logout} className="p-5 rounded-[2rem] border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-3 font-black text-xs active:scale-95 transition-all uppercase tracking-widest"><LogOut size={20} /> Çıkış Yap</button>
        </div>
      </Dialog>

      <Dialog isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} title="Simge Seç">
        <div className="grid grid-cols-4 gap-4 p-2">
          {Object.keys(ICONS).map((key) => {
            const Icon = ICONS[key];
            return (<button key={key} onClick={() => { actions.updateSchoolIcon(key); setIsLogoModalOpen(false); }} className={`aspect-square flex items-center justify-center rounded-2xl border-2 transition-all ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}><Icon size={24} strokeWidth={2.5} /></button>);
          })}
        </div>
      </Dialog>
    </div>
  );
};