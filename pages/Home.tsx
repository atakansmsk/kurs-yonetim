
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Pencil, 
  Sparkles, 
  Palette, 
  Music, 
  BookOpen, 
  Trophy, 
  Activity, 
  UserPlus, 
  ImagePlus, 
  Users, 
  LogOut, 
  Settings, 
  CheckCircle2, 
  Zap, 
  GraduationCap, 
  CalendarRange, 
  ChevronRight, 
  ChevronLeft, 
  Share2, 
  AlertTriangle, 
  UploadCloud, 
  Loader2,
  Clock,
  PlayCircle,
  Coffee
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

  // Update clock every minute for live feed
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
          alert("Veriler başarıyla buluta kaydedildi!");
      } catch (e) {
          alert("Hata oluştu, lütfen internetinizi kontrol edin.");
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
      alert(`${teacherName} için ders programı linki kopyalandı!`);
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

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-5 pt-8 pb-32 no-scrollbar">
      
      {/* 0. RECOVERY WARNING */}
      {isRecovered && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-3xl animate-pulse flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-[11px] font-bold text-amber-900 leading-tight">Veriler yerel yedekten yüklendi.</p>
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-[10px] font-black shrink-0">DÜZELT</button>
          </div>
      )}

      {/* 1. Header Section - V2 Style */}
      <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">{state.schoolName}</span>
             <h1 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Hoş Geldin, <br/><span className="text-indigo-600">{user?.name.split(' ')[0]}</span></h1>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className={`p-3 rounded-[1.2rem] border shadow-soft transition-all active:scale-90 relative ${isRecovered ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 border-slate-100'}`}>
             <Settings size={22} />
             {state.autoLessonProcessing && <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white"></div>}
          </button>
      </div>

      {/* 2. LIVE STATUS CARD (V2 MAIN FEATURE) */}
      <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
        <div className="relative group overflow-hidden bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-indigo-200/50">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-[40px] -ml-8 -mb-8"></div>
            
            <div className="relative z-10">
                {liveStatus.statusType === 'IN_LESSON' ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                                <PlayCircle size={14} className="text-indigo-400 animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Ders Devam Ediyor</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{liveStatus.currentSlot?.start} - {liveStatus.currentSlot?.end}</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{state.students[liveStatus.currentSlot!.studentId!]?.name}</h2>
                            <p className="text-indigo-300 text-xs font-bold mt-1 tracking-wide">Kalan: {liveStatus.timeLeft} dakika</p>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-300 transition-all duration-1000 ease-out" 
                                style={{ width: `${liveStatus.progress}%` }}
                            ></div>
                        </div>
                    </div>
                ) : liveStatus.statusType === 'BREAK' ? (
                    <div className="flex flex-col items-center text-center py-2">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
                            <Clock size={28} />
                        </div>
                        <h3 className="text-lg font-black text-white">Ders Arası</h3>
                        <p className="text-slate-400 text-xs font-bold mt-1">Sıradaki: <span className="text-indigo-300">{state.students[liveStatus.nextSlot!.studentId!]?.name || "Boş Ders"}</span></p>
                        <div className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/50">
                           {liveStatus.timeLeft} DK SONRA
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center py-2">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
                            <Coffee size={28} />
                        </div>
                        <h3 className="text-lg font-black text-white">Bugünlük Bu Kadar</h3>
                        <p className="text-slate-500 text-xs font-medium mt-1">Tüm dersler tamamlandı veya henüz başlamadı.</p>
                        <button onClick={() => onNavigate('SCHEDULE')} className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">PROGRAMA GÖZ AT</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 3. Stats Row - V2 Clean Style */}
      <div className="grid grid-cols-2 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="bg-white p-5 rounded-[2rem] shadow-soft border border-slate-100 flex flex-col justify-between h-36">
             <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users size={20} /></div>
             <div>
                <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{currentTeacherStudentCount}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-1">Öğrenciniz</span>
             </div>
          </div>
          <div className="bg-white p-2 rounded-[2rem] shadow-soft border border-slate-100 flex items-center justify-between h-36 relative">
             <button onClick={() => setDayOffset(prev => prev - 1)} className="h-full px-2 flex items-center justify-center text-slate-300 hover:text-indigo-600 transition-colors"><ChevronLeft size={20} /></button>
             <div className="flex flex-col items-center flex-1">
                 <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{dailyStats.count}</span>
                 <div className="text-center mt-1">
                     <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{dailyStats.label}</span>
                     {dailyStats.label !== dailyStats.fullDayName && (<span className="text-[8px] font-bold text-slate-300 uppercase tracking-tight">{dailyStats.fullDayName}</span>)}
                 </div>
             </div>
             <button onClick={() => setDayOffset(prev => prev + 1)} className="h-full px-2 flex items-center justify-center text-slate-300 hover:text-indigo-600 transition-colors"><ChevronRight size={20} /></button>
          </div>
      </div>

      {/* 4. MAIN ACTION BUTTON - Premium Style */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
        <button onClick={() => onNavigate('SCHEDULE')} className="w-full bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100 flex items-center justify-between group active:scale-95 transition-all overflow-hidden relative">
            {/* Glossy Overlay */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 -skew-y-12"></div>
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><Calendar size={28} /></div>
                <div className="text-left text-white">
                    <h4 className="font-black text-xl tracking-tight leading-none">Ders Programı</h4>
                    <p className="text-[11px] text-indigo-100/70 font-bold mt-1 uppercase tracking-wider">Haftalık Takvim</p>
                </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center relative z-10 group-hover:bg-white group-hover:text-indigo-600 transition-all"><ChevronRight size={20} /></div>
        </button>
      </div>

      {/* 5. Secondary Actions */}
      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
        <button onClick={() => setIsTeachersListOpen(true)} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-soft flex flex-col items-start gap-3 hover:border-indigo-200 transition-all active:scale-95">
             <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><GraduationCap size={20} /></div>
             <div className="text-left"><h4 className="font-black text-slate-800 text-sm">Eğitmenler</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Hesap Değiştir</p></div>
        </button>
         <button onClick={() => onNavigate('STUDENTS')} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-soft flex flex-col items-start gap-3 hover:border-indigo-200 transition-all active:scale-95">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center"><UserPlus size={20} /></div>
             <div className="text-left"><h4 className="font-black text-slate-800 text-sm">Kişiler</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Öğrenci Listesi</p></div>
        </button>
      </div>

      {/* Teachers Modal */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Yeni Eğitmen" : "Eğitmenler"}
        actions={isAddTeacherMode ? (<><button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">Geri</button><button onClick={handleSaveTeacher} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md shadow-slate-300 hover:shadow-none transition-all active:scale-95">Kaydet</button></>) : (<button onClick={() => setIsAddTeacherMode(true)} className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95"><UserPlus size={16} /> Eğitmen Ekle</button>)}>
          {isAddTeacherMode ? (<div className="py-1"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-slate-900 outline-none" placeholder="Ad Soyad..." autoFocus /></div>) : (<div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">{state.teachers.length === 0 ? <div className="text-center py-6 opacity-50"><p className="font-bold text-sm text-slate-400">Kayıtlı eğitmen yok.</p></div> : state.teachers.map(teacher => {const count = getStudentCountForTeacher(teacher); return (<div key={teacher} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-100 transition-colors"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${teacher === state.currentTeacher ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div><div><div className="font-bold text-slate-800 text-sm">{teacher}</div><div className="text-[10px] font-bold text-slate-400">{count} Öğrenci</div></div></div><div className="flex items-center gap-2"><button onClick={(e) => handleShareTeacherLink(e, teacher)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors" title="Paylaşım Linkini Kopyala"><Share2 size={16} /></button>{teacher !== state.currentTeacher && (<button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-bold border border-slate-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Seç</button>)}</div></div>);})}</div>)}
      </Dialog>

      {/* Settings Modal (LOGO UPLOAD IS HERE) */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
             {/* Profile Info */}
             <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700">{user?.name.charAt(0).toUpperCase()}</div>
                <div><h3 className="font-bold text-slate-900">{user?.name}</h3><p className="text-xs text-slate-500">{user?.email}</p></div>
             </div>

             {/* LOGO UPLOAD (Moved here from Home) */}
             <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Okul Logosu</h4>
                 <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {state.schoolIcon.startsWith('data:') ? (
                            <img src={state.schoolIcon} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <Sparkles size={24} className="text-slate-300" />
                        )}
                     </div>
                     <div className="flex flex-col gap-2">
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs border border-indigo-100"
                        >
                            Görsel Seç
                        </button>
                        <button 
                            onClick={() => setIsLogoModalOpen(true)}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs border border-slate-100"
                        >
                            İkon Seç
                        </button>
                     </div>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
             </div>

            {/* FORCE SYNC */}
            {isRecovered && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                     <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <UploadCloud size={14} /> Bulut Eşitlemesi
                     </h4>
                     <button 
                        onClick={handleForceSync}
                        disabled={isSyncing}
                        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-200 active:scale-95 transition-all"
                     >
                        {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Şimdi Buluta Yedekle</>}
                     </button>
                </div>
            )}

            <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tema Rengi</h4>
                 <div className="flex gap-3 justify-center flex-wrap">
                    {THEME_OPTIONS.map(theme => (
                        <button key={theme.key} onClick={() => actions.updateThemeColor(theme.key)} className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${state.themeColor === theme.key ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: theme.color }} title={theme.key} />
                    ))}
                 </div>
            </div>

            <button onClick={actions.toggleAutoProcessing} className={`p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${state.autoLessonProcessing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Zap size={20} fill="currentColor" /></div>
                    <div className="text-left"><h4 className={`font-bold text-sm ${state.autoLessonProcessing ? 'text-indigo-900' : 'text-slate-700'}`}>Otomatik Ders İşle</h4><p className="text-[10px] opacity-70 leading-tight mt-0.5">Ders günü gelen öğrencileri<br/>otomatik borçlandır.</p></div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-500' : 'bg-slate-200'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${state.autoLessonProcessing ? 'translate-x-5' : 'translate-x-0'}`}></div></div>
            </button>
            <button onClick={logout} className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-2 font-bold text-sm hover:bg-red-100 transition-colors"><LogOut size={18} /> Çıkış Yap</button>
        </div>
      </Dialog>

      {/* İkon Seçme Modal (Settings içinden açılır) */}
      <Dialog isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} title="İkon Seç">
        <div className="grid grid-cols-4 gap-3 p-1">
          {Object.keys(ICONS).map((key) => {
            const Icon = ICONS[key];
            return (<button key={key} onClick={() => { actions.updateSchoolIcon(key); setIsLogoModalOpen(false); }} className={`aspect-square flex items-center justify-center rounded-2xl border transition-all ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}><Icon size={24} strokeWidth={1.5} /></button>);
          })}
        </div>
      </Dialog>
    </div>
  );
};
