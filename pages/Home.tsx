import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Pencil, ArrowRight, Sparkles, Palette, Music, BookOpen, Trophy, Activity, UserPlus, ImagePlus, Users, LogOut, Settings, RefreshCw, CheckCircle2, Zap, GraduationCap, CalendarRange, ChevronRight, LayoutGrid } from 'lucide-react';
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

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state, actions } = useCourse();
  const { logout, user } = useAuth();
  
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isTeachersListOpen, setIsTeachersListOpen] = useState(false);
  const [isAddTeacherMode, setIsAddTeacherMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomLogo = state.schoolIcon.startsWith('data:');
  const CurrentIcon = !isCustomLogo ? (ICONS[state.schoolIcon] || Sparkles) : Sparkles;
  
  // --- Dynamic Date Logic ---
  const [todayData, setTodayData] = useState({ count: 0, label: "Bugün" });

  useEffect(() => {
    // JS getDay(): 0=Pazar, 1=Pazartesi ... 6=Cumartesi
    // Map to App Keys used in schedule (defined in types.ts as DAYS)
    const jsDayToAppKey: Record<number, string> = {
        0: "Pazar",
        1: "Pazartesi",
        2: "Salı",
        3: "Çarşamba",
        4: "Perşembe",
        5: "Cuma",
        6: "Cmt"
    };
    
    const today = new Date();
    const dayIndex = today.getDay();
    const appDayKey = jsDayToAppKey[dayIndex];
    
    const key = `${state.currentTeacher}|${appDayKey}`;
    const count = (state.schedule[key] || []).filter(s => s.studentId).length;
    
    setTodayData({ count, label: appDayKey });
  }, [state.schedule, state.currentTeacher]);
  // --------------------------
  
  // HELPER: Belirli bir öğretmenin kaç farklı öğrencisi olduğunu hesapla
  const getStudentCountForTeacher = (teacherName: string) => {
    const uniqueStudents = new Set<string>();
    Object.keys(state.schedule).forEach(key => {
        if (key.startsWith(`${teacherName}|`)) {
            state.schedule[key].forEach(slot => {
                if (slot.studentId) {
                    uniqueStudents.add(slot.studentId);
                }
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

  const THEME_OPTIONS = [
    { key: 'indigo', color: '#4f46e5' },
    { key: 'blue', color: '#0284c7' },
    { key: 'emerald', color: '#059669' },
    { key: 'violet', color: '#7c3aed' },
    { key: 'rose', color: '#e11d48' },
    { key: 'amber', color: '#d97706' },
    { key: 'neutral', color: '#334155' }, // Black/Neutral
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-5 pt-8 pb-32">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Merhaba,</h1>
             <p className="text-sm font-medium text-slate-400 mt-1">{user?.name}</p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors relative">
             <Settings size={20} />
             {state.autoLessonProcessing && <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border border-white"></div>}
          </button>
      </div>

      {/* 2. Brand Card */}
      <button 
         onClick={() => setIsLogoModalOpen(true)}
         className="w-full bg-white rounded-[2rem] p-1.5 shadow-soft border border-slate-100 mb-6 relative group active:scale-[0.99] transition-all"
      >
         {isCustomLogo ? (
             <div className="w-full h-32 rounded-[1.7rem] overflow-hidden bg-slate-50 relative">
                <img src={state.schoolIcon} alt="Logo" className="h-full w-full object-contain" />
             </div>
         ) : (
             <div className="w-full h-32 rounded-[1.7rem] bg-gradient-to-r from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white shadow-inner gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <CurrentIcon size={36} strokeWidth={1.5} className="relative z-10" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest relative z-10">{state.schoolName}</span>
             </div>
         )}
         <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-white/40 transition-colors z-20">
             <Pencil size={14} />
         </div>
      </button>

      {/* 3. Stats Row (Colored Widgets) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 flex flex-col items-start justify-center relative overflow-hidden">
             <div className="absolute right-[-10px] top-[-10px] text-indigo-100 opacity-50"><Users size={60} /></div>
             <span className="text-3xl font-black text-indigo-900 z-10">{currentTeacherStudentCount}</span>
             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide z-10">Öğrenciniz</span>
          </div>

          <div className="bg-purple-50/50 p-4 rounded-3xl border border-purple-100 flex flex-col items-start justify-center relative overflow-hidden">
             <div className="absolute right-[-10px] top-[-10px] text-purple-100 opacity-50"><CalendarRange size={60} /></div>
             <span className="text-3xl font-black text-purple-900 z-10">{todayData.count}</span>
             <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide z-10">{todayData.label} Dersi</span>
          </div>
      </div>

      {/* 4. MAIN ACTION: Schedule (Hero Widget) */}
      <div className="mb-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 ml-1">Hızlı Erişim</h3>
        <button 
           onClick={() => onNavigate('SCHEDULE')}
           className="w-full bg-white p-5 rounded-[2rem] shadow-soft border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all active:scale-[0.98]"
        >
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-glow-colored shadow-indigo-500 group-hover:scale-110 transition-transform">
                    <Calendar size={28} />
                </div>
                <div className="text-left">
                    <h4 className="font-black text-xl text-slate-800">Ders Programı</h4>
                    <p className="text-xs text-slate-400 font-medium">Takvimi görüntüle ve düzenle</p>
                </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <ChevronRight size={20} />
            </div>
        </button>
      </div>

      {/* 5. Secondary Actions Grid */}
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 ml-1">Yönetim</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Eğitmenler */}
        <button 
           onClick={() => setIsTeachersListOpen(true)} 
           className="bg-white p-4 rounded-3xl border border-slate-100 shadow-soft flex flex-col items-start gap-3 hover:border-slate-300 transition-all active:scale-[0.98]"
        >
             <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <GraduationCap size={20} />
             </div>
             <div className="text-left">
                 <h4 className="font-bold text-slate-800 text-sm">Eğitmenler</h4>
                 <p className="text-[10px] text-slate-400 font-medium">Hesap Geçişi</p>
             </div>
        </button>

         {/* Öğrenci Ekle */}
         <button 
           onClick={() => onNavigate('STUDENTS')} 
           className="bg-white p-4 rounded-3xl border border-slate-100 shadow-soft flex flex-col items-start gap-3 hover:border-slate-300 transition-all active:scale-[0.98]"
        >
             <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <UserPlus size={20} />
             </div>
             <div className="text-left">
                 <h4 className="font-bold text-slate-800 text-sm">Öğrenciler</h4>
                 <p className="text-[10px] text-slate-400 font-medium">Listeyi Düzenle</p>
             </div>
        </button>
      </div>

      {/* Logo Modal */}
      <Dialog isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} title="Logo Düzenle">
        <div className="grid grid-cols-4 gap-3 p-1">
          <button onClick={() => fileInputRef.current?.click()} className="col-span-4 py-6 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-500 bg-indigo-50/30 hover:bg-indigo-50 transition-all mb-2">
            <ImagePlus size={32} />
            <span className="text-xs font-black uppercase tracking-wide">Galeriden Yükle</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
          {Object.keys(ICONS).map((key) => {
            const Icon = ICONS[key];
            return (
              <button key={key} onClick={() => { actions.updateSchoolIcon(key); setIsLogoModalOpen(false); }} className={`aspect-square flex items-center justify-center rounded-2xl border transition-all ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                <Icon size={24} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </Dialog>

      {/* Teachers Modal */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Yeni Eğitmen" : "Eğitmenler"}
        actions={
            isAddTeacherMode ? (
                <>
                     <button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">Geri</button>
                     <button onClick={handleSaveTeacher} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md shadow-slate-300 hover:shadow-none transition-all active:scale-95">Kaydet</button>
                </>
            ) : (
                <button onClick={() => setIsAddTeacherMode(true)} className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95">
                    <UserPlus size={16} /> Eğitmen Ekle
                </button>
            )
        }
      >
          {isAddTeacherMode ? (
              <div className="py-1"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-slate-900 outline-none" placeholder="Ad Soyad..." autoFocus /></div>
          ) : (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {state.teachers.length === 0 ? <div className="text-center py-6 opacity-50"><p className="font-bold text-sm text-slate-400">Kayıtlı eğitmen yok.</p></div> : 
                      state.teachers.map(teacher => {
                          const count = getStudentCountForTeacher(teacher);
                          return (
                            <div key={teacher} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${teacher === state.currentTeacher ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{teacher}</div>
                                        <div className="text-[10px] font-bold text-slate-400">{count} Öğrenci</div>
                                    </div>
                                </div>
                                {teacher !== state.currentTeacher && <button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-bold border border-slate-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Seç</button>}
                            </div>
                          );
                      })
                  }
              </div>
          )}
      </Dialog>

      {/* Settings Modal */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
             {/* Profile Info */}
             <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg font-bold text-slate-700">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">{user?.name}</h3>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
             </div>

            {/* Tema Rengi Seçimi */}
            <div className="bg-white border border-slate-100 p-4 rounded-2xl">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tema Rengi</h4>
                 <div className="flex gap-3 justify-center flex-wrap">
                    {THEME_OPTIONS.map(theme => (
                        <button 
                            key={theme.key} 
                            onClick={() => actions.updateThemeColor(theme.key)}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${state.themeColor === theme.key ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: theme.color }}
                            title={theme.key}
                        />
                    ))}
                 </div>
            </div>

            {/* Otomatik Ders Toggle */}
            <button onClick={actions.toggleAutoProcessing} className={`p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${state.autoLessonProcessing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-bold text-sm ${state.autoLessonProcessing ? 'text-indigo-900' : 'text-slate-700'}`}>Otomatik Ders İşle</h4>
                        <p className="text-[10px] opacity-70 leading-tight mt-0.5">Ders günü gelen öğrencileri<br/>otomatik olarak borçlandır.</p>
                    </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${state.autoLessonProcessing ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
            </button>
            
            <button onClick={logout} className="p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 flex items-center justify-center gap-2 font-bold text-sm hover:bg-red-100 transition-colors">
                <LogOut size={18} /> Çıkış Yap
            </button>
        </div>
      </Dialog>
    </div>
  );
};