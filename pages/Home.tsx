
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
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
  Clock,
  Coffee,
  LayoutDashboard,
  Bell,
  CalendarDays,
  Forward,
  User,
  ImageIcon
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
    const nextSlot = todaysSlots.find(s => timeToMinutes(s.start) > currentMins && s.id !== currentSlot?.id);

    let statusType: 'IN_LESSON' | 'BREAK' | 'IDLE' = 'IDLE';
    let timeLeft = 0;
    let progress = 0;
    let gapToNext = 0;

    if (currentSlot && currentSlot.studentId) {
        statusType = 'IN_LESSON';
        const start = timeToMinutes(currentSlot.start);
        const end = timeToMinutes(currentSlot.end);
        timeLeft = end - currentMins;
        progress = ((currentMins - start) / (end - start)) * 100;

        if (nextSlot) {
            gapToNext = timeToMinutes(nextSlot.start) - end;
        }
    } else if (nextSlot) {
        statusType = 'BREAK';
        timeLeft = timeToMinutes(nextSlot.start) - currentMins;
    }

    return { statusType, currentSlot, nextSlot, timeLeft, progress, gapToNext };
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
      // Fix: Use navigator.clipboard.writeText instead of the non-existent navigator.clipboard.text property.
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
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-y-auto px-5 pt-8 pb-32 no-scrollbar scroll-smooth">
      
      {/* 1. Slim Header Section */}
      <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Eğitmen Paneli</span>
             <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Merhaba, <span className="text-indigo-600">{userName}</span>
             </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-90 relative ${isRecovered ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}
          >
            <Settings size={20} />
            {state.autoLessonProcessing && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></div>}
          </button>
      </div>

      {/* 2. COMPACT LIVE FEED */}
      <div className="mb-6">
          {liveStatus.statusType === 'IN_LESSON' ? (
              <div className="bg-slate-900 rounded-2xl p-4 shadow-xl shadow-slate-200/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Ders İşleniyor</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{liveStatus.currentSlot?.start} - {liveStatus.currentSlot?.end}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                      <h2 className="text-lg font-black text-white truncate">{state.students[liveStatus.currentSlot!.studentId!]?.name}</h2>
                      <span className="text-[10px] font-black text-indigo-400 shrink-0">{liveStatus.timeLeft} dk kaldı</span>
                  </div>

                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${liveStatus.progress}%` }}></div>
                  </div>

                  <div className="mt-1 pt-3 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                           <Forward size={12} className="text-slate-500" />
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sıradaki</span>
                       </div>
                       <div className="text-right">
                           {liveStatus.nextSlot ? (
                               <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-bold text-indigo-300">
                                       {liveStatus.nextSlot.studentId ? state.students[liveStatus.nextSlot.studentId]?.name : "Boş Saat"}
                                   </span>
                                   {liveStatus.gapToNext > 0 && (
                                       <span className="text-[9px] font-black bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">
                                           {liveStatus.gapToNext} dk ara
                                       </span>
                                   )}
                                   {liveStatus.gapToNext === 0 && (
                                        <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                                            Peş peşe
                                        </span>
                                   )}
                               </div>
                           ) : (
                               <span className="text-[10px] font-bold text-slate-600">Başka ders yok</span>
                           )}
                       </div>
                  </div>
              </div>
          ) : liveStatus.statusType === 'BREAK' ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Clock size={18} /></div>
                      <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sıradaki Ders</div>
                          <div className="text-sm font-black text-slate-800">{state.students[liveStatus.nextSlot!.studentId!]?.name || "Boş"}</div>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-[10px] font-black text-indigo-600">{liveStatus.timeLeft} dk</div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase">{liveStatus.nextSlot?.start}</div>
                  </div>
              </div>
          ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 opacity-60">
                  <Coffee size={18} className="text-slate-400" />
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Gün Tamamlandı</span>
              </div>
          )}
      </div>

      {/* 3. GRID SYSTEM */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 group active:scale-[0.98] transition-all" onClick={() => onNavigate('STUDENTS')}>
             <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all"><Users size={18} /></div>
             <div>
                <span className="text-2xl font-black text-slate-800 leading-none block">{currentTeacherStudentCount}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mt-1">Öğrenci Kaydı</span>
             </div>
          </div>

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-32">
             <div className="flex items-center justify-between mb-auto">
                <button onClick={() => setDayOffset(prev => prev - 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-50 active:scale-90"><ChevronLeft size={16} /></button>
                <button onClick={() => setDayOffset(prev => prev + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-50 active:scale-90"><ChevronRight size={16} /></button>
             </div>
             <div className="flex flex-col items-center text-center">
                 <span className="text-2xl font-black text-slate-800 leading-none">{dailyStats.count}</span>
                 <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">{dailyStats.label}</span>
             </div>
          </div>
      </div>

      <button 
          onClick={() => onNavigate('SCHEDULE')} 
          className="w-full bg-slate-900 p-5 rounded-2xl shadow-lg shadow-slate-200 flex items-center justify-between group active:scale-[0.99] transition-all mb-3"
      >
          <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center group-hover:rotate-3 transition-transform">
                  <CalendarDays size={20} />
              </div>
              <div className="text-left">
                  <h4 className="font-black text-white text-base tracking-tight">Haftalık Program</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Ders Takvimini Yönet</p>
              </div>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <button onClick={() => setIsTeachersListOpen(true)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all">
             <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center"><GraduationCap size={16} /></div>
             <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider">Kadro</span>
        </button>
        <button onClick={() => onNavigate('WEEKLY')} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all">
             <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center"><LayoutDashboard size={16} /></div>
             <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider">Özet</span>
        </button>
      </div>

      {/* MODALS */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Eğitmen Ekle" : "Kadro"}
        actions={isAddTeacherMode ? (<><button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleSaveTeacher} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md">Ekle</button></>) : (<button onClick={() => setIsAddTeacherMode(true)} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest"><UserPlus size={16} /> Yeni Eğitmen</button>)}>
          {isAddTeacherMode ? (<div className="py-2"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 transition-all outline-none" placeholder="Ad Soyad..." autoFocus /></div>) : (<div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">{state.teachers.length === 0 ? <p className="text-center py-6 text-slate-400 font-bold text-xs">Eğitmen bulunamadı.</p> : state.teachers.map(teacher => {const count = getStudentCountForTeacher(teacher); return (<div key={teacher} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${teacher === state.currentTeacher ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div><div><div className="font-black text-slate-800 text-sm">{teacher}</div><div className="text-[10px] font-bold text-slate-400 mt-0.5">{count} Öğrenci</div></div></div><div className="flex items-center gap-2"><button onClick={(e) => handleShareTeacherLink(e, teacher)} className="p-2 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors"><Share2 size={16} /></button>{teacher !== state.currentTeacher && (<button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-black border border-slate-200 rounded-lg hover:border-indigo-600 transition-all uppercase tracking-wider">Seç</button>)}</div></div>);})}</div>)}
      </Dialog>

      {/* COMPACT SETTINGS MODAL */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto no-scrollbar py-1">
             
             {/* Account List Item */}
             <div className="flex items-center gap-3 p-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'E'}
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-[13px] leading-none mb-1">{user?.name || 'Eğitmen'}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
                </div>
             </div>

             {/* Section: School Info */}
             <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Okul Yapılandırması</h4>
                 
                 <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-3">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                            <GraduationCap size={16} />
                         </div>
                         <input 
                            type="text" 
                            value={state.schoolName} 
                            onChange={(e) => actions.updateSchoolName(e.target.value)} 
                            className="flex-1 bg-transparent border-none font-bold text-slate-800 text-xs outline-none focus:text-indigo-600 transition-colors" 
                            placeholder="Okul Adı..."
                         />
                     </div>
                     <div className="h-px bg-slate-50"></div>
                     <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 group">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:text-indigo-600 transition-colors">
                            <ImageIcon size={16} />
                         </div>
                         <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">Logo/İkon Değiştir</span>
                     </button>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
             </div>

             {/* Section: App Features */}
             <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Özellikler</h4>
                 
                 <button onClick={actions.toggleAutoProcessing} className="w-full flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                            <Zap size={16} fill={state.autoLessonProcessing ? "currentColor" : "none"} />
                        </div>
                        <span className={`font-bold text-xs ${state.autoLessonProcessing ? 'text-slate-800' : 'text-slate-500'}`}>Otomatik Borçlandır</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${state.autoLessonProcessing ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                 </button>
             </div>

             {/* Section: Appearance */}
             <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Görünüm</h4>
                 <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                    <div className="grid grid-cols-5 gap-2">
                        {THEME_OPTIONS.map(theme => (
                            <button 
                                key={theme.key} 
                                onClick={() => actions.updateThemeColor(theme.key)} 
                                className={`aspect-square rounded-full border-2 transition-all ${state.themeColor === theme.key ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent opacity-60'}`} 
                                style={{ backgroundColor: theme.color }} 
                            />
                        ))}
                    </div>
                 </div>
             </div>

             {/* Logout Button */}
             <div className="pt-2">
                 <button 
                    onClick={logout} 
                    className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] active:scale-95 transition-all uppercase tracking-widest"
                 >
                    <LogOut size={16} /> Oturumu Kapat
                 </button>
             </div>
        </div>
      </Dialog>
    </div>
  );
};
