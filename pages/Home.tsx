
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { 
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
  CalendarDays,
  Forward,
  ImageIcon,
  TrendingUp,
  LayoutGrid,
  Sun,
  Flame,
  Calendar
} from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface HomeProps {
  onNavigate: (tab: 'SCHEDULE' | 'STUDENTS' | 'WEEKLY') => void;
}

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state, actions, isRecovered } = useCourse();
  const { logout, user } = useAuth();
  
  const [isTeachersListOpen, setIsTeachersListOpen] = useState(false);
  const [isAddTeacherMode, setIsAddTeacherMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const jsDayToAppKey: Record<number, string> = {
      0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt"
  };

  const todaysData = useMemo(() => {
    const dayName = jsDayToAppKey[currentTime.getDay()];
    const key = `${state.currentTeacher}|${dayName}`;
    const slots = (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    const activeLessons = slots.filter(s => s.studentId);
    
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const currentSlot = slots.find(s => timeToMinutes(s.start) <= currentMins && timeToMinutes(s.end) > currentMins);
    const nextSlot = slots.find(s => timeToMinutes(s.start) > currentMins && s.studentId);
    
    const firstLesson = activeLessons[0];
    const dayStarted = activeLessons.length > 0 && currentMins >= timeToMinutes(activeLessons[0].start);

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

    return { 
        statusType, 
        currentSlot, 
        nextSlot, 
        timeLeft, 
        progress, 
        gapToNext, 
        firstLesson, 
        dayStarted, 
        lessonCount: activeLessons.length,
        dayName
    };
  }, [state.schedule, state.currentTeacher, currentTime]);

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
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-y-auto no-scrollbar scroll-smooth">
      
      {/* HEADER SECTION */}
      <div className="px-6 pt-8 pb-4">
          <div className="flex items-center justify-between">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{todaysData.dayName.toUpperCase()}, {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
                 <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                    Merhaba, <span className="text-indigo-600">{userName} 👋</span>
                 </h1>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)} 
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 relative ${isRecovered ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}
              >
                <Settings size={20} />
                {state.autoLessonProcessing && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></div>}
              </button>
          </div>
      </div>

      {/* GÜNLÜK KARŞILAMA / İLK DERS BİLGİSİ */}
      {!todaysData.dayStarted && todaysData.firstLesson && (
          <div className="px-6 mb-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 flex items-center gap-4 animate-in slide-in-from-left duration-700">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50 shrink-0">
                      <Sun size={24} strokeWidth={2.5} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">GÜNÜN BAŞLANGICI</p>
                      <h3 className="text-sm font-bold text-indigo-900 leading-tight">
                          Bugün ilk dersiniz saat <span className="text-indigo-600 font-black">{todaysData.firstLesson.start}</span>'da <span className="text-indigo-600 font-black">{state.students[todaysData.firstLesson.studentId!]?.name}</span> ile başlıyor.
                      </h3>
                  </div>
              </div>
          </div>
      )}

      {/* PRIMARY: CANLI AKIŞ */}
      <div className="px-6 mb-8">
          {todaysData.statusType === 'IN_LESSON' ? (
              <div className="bg-slate-900 rounded-[2.5rem] p-7 shadow-2xl shadow-indigo-200/50 flex flex-col gap-6 relative overflow-hidden border border-white/5 animate-in fade-in zoom-in-95 duration-700">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs font-black text-indigo-300 uppercase tracking-[0.25em]">AKTİF DERS</span>
                      </div>
                      <div className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                        <span className="text-[10px] font-bold text-indigo-200">{todaysData.currentSlot?.start} - {todaysData.currentSlot?.end}</span>
                      </div>
                  </div>
                  
                  <div className="flex items-end justify-between gap-4">
                      <div className="flex-1 min-w-0">
                          <h2 className="text-3xl font-black text-white truncate tracking-tighter leading-tight">
                              {state.students[todaysData.currentSlot!.studentId!]?.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-2">
                             <TrendingUp size={14} className="text-indigo-400" />
                             <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ders İşleniyor</span>
                          </div>
                      </div>
                      <div className="text-right shrink-0">
                          <div className="text-4xl font-black text-indigo-400 leading-none tracking-tighter">{todaysData.timeLeft}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase mt-2 tracking-widest">DK KALDI</div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-[1.5px]">
                          <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" style={{ width: `${todaysData.progress}%` }}></div>
                      </div>
                  </div>

                  <div className="pt-5 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                           <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500"><Forward size={16} /></div>
                           <div>
                               <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-0.5">SIRADAKİ</span>
                               <span className="text-xs font-bold text-indigo-100">
                                   {todaysData.nextSlot ? (state.students[todaysData.nextSlot.studentId!]?.name || "Boş Saat") : "Gün Sonu"}
                               </span>
                           </div>
                       </div>
                       {todaysData.gapToNext > 0 && (
                            <div className="bg-amber-500/10 text-amber-500 px-3 py-2 rounded-2xl border border-amber-500/20 flex items-center gap-2">
                                <Clock size={12} strokeWidth={2.5} />
                                <span className="text-[10px] font-black tracking-tight">{todaysData.gapToNext} DK ARA</span>
                            </div>
                       )}
                  </div>
              </div>
          ) : todaysData.statusType === 'BREAK' ? (
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-xl shadow-slate-200/50 flex flex-col gap-5 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                  <div className="flex items-center justify-between relative z-10">
                      <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl flex items-center gap-2.5">
                          <Coffee size={18} strokeWidth={2.5} className="animate-bounce" />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em]">ARA VERİLİYOR</span>
                      </div>
                      <span className="text-xl">☕</span>
                  </div>
                  
                  <div className="flex items-end justify-between relative z-10">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">SIRADAKİ ÖĞRENCİ</p>
                          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{state.students[todaysData.nextSlot!.studentId!]?.name || "Boş Ders"}</h2>
                      </div>
                      <div className="text-right">
                          <p className="text-3xl font-black text-indigo-600 leading-none tracking-tighter">{todaysData.timeLeft}</p>
                          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">DK SONRA</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 relative z-10 backdrop-blur-sm">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100"><Clock size={20} /></div>
                      <span className="text-xs font-bold text-slate-600 tracking-tight leading-relaxed">Hazırlık için vaktiniz var. Ders saat <span className="text-indigo-600 font-black">{todaysData.nextSlot?.start}</span>'da.</span>
                  </div>
              </div>
          ) : (
              <div className="bg-slate-50 border border-slate-100 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center gap-5 opacity-60 grayscale animate-in fade-in duration-1000">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300 border border-slate-50"><Coffee size={36} /></div>
                  <div className="text-center">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] block">GÜN TAMAMLANDI</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-3 block max-w-[180px] leading-relaxed mx-auto">Bugün için planlanan tüm derslerinizi bitirdiniz. İyi dinlenmeler!</span>
                  </div>
              </div>
          )}
      </div>

      {/* DAILY INSIGHT BAR */}
      <div className="px-6 mb-8">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Flame size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                      <h4 className="text-sm font-black text-slate-800 leading-none">Günlük Yoğunluk</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Bugün Toplam <span className="text-orange-600">{todaysData.lessonCount} Ders</span> Planlandı</p>
                  </div>
              </div>
              <div className="flex items-center -space-x-2">
                  {[...Array(Math.min(todaysData.lessonCount, 3))].map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                          <Users size={12} className="text-slate-400" />
                      </div>
                  ))}
                  {todaysData.lessonCount > 3 && (
                      <div className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                          +{todaysData.lessonCount - 3}
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="px-6 space-y-4 mb-12">
          <button 
              onClick={() => onNavigate('SCHEDULE')} 
              className="w-full bg-slate-900 p-5 rounded-[1.75rem] shadow-2xl shadow-slate-200 flex items-center justify-between group active:scale-[0.98] transition-all border border-slate-800"
          >
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center group-hover:rotate-3 transition-transform shadow-lg shadow-indigo-500/20">
                      <CalendarDays size={24} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                      <h4 className="font-black text-white text-base tracking-tight leading-none">Haftalık Program</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-2">TAKVİMİ YÖNET</p>
                  </div>
              </div>
              <ChevronRight size={20} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIsTeachersListOpen(true)} className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all group">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm"><GraduationCap size={20} strokeWidth={2.5} /></div>
                 <span className="font-black text-slate-800 text-[11px] uppercase tracking-[0.1em]">KADRO</span>
            </button>
            <button onClick={() => onNavigate('WEEKLY')} className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all group">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><LayoutGrid size={20} strokeWidth={2.5} /></div>
                 <span className="font-black text-slate-800 text-[11px] uppercase tracking-[0.1em]">ÖZET</span>
            </button>
          </div>
      </div>

      {/* FOOTER DECOR */}
      <div className="px-6 text-center opacity-20 pb-32">
          <div className="w-full h-px bg-slate-300 mb-6"></div>
          <span className="text-[9px] font-black tracking-[0.5em] text-slate-400 uppercase">KURS YÖNETİM PRO v1.0</span>
      </div>

      {/* MODALS */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Eğitmen Ekle" : "Kadro"}
        actions={isAddTeacherMode ? (<><button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleSaveTeacher} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md">Ekle</button></>) : (<button onClick={() => setIsAddTeacherMode(true)} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest"><UserPlus size={16} /> Yeni Eğitmen</button>)}>
          {isAddTeacherMode ? (<div className="py-2"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 transition-all outline-none" placeholder="Ad Soyad..." autoFocus /></div>) : (<div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">{state.teachers.length === 0 ? <p className="text-center py-6 text-slate-400 font-bold text-xs">Eğitmen bulunamadı.</p> : state.teachers.map(teacher => (<div key={teacher} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${teacher === state.currentTeacher ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div><div><div className="font-black text-slate-800 text-sm">{teacher}</div><div className="text-[10px] font-bold text-slate-400 mt-0.5">Eğitmen</div></div></div><div className="flex items-center gap-2"><button onClick={(e) => handleShareTeacherLink(e, teacher)} className="p-2 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors"><Share2 size={16} /></button>{teacher !== state.currentTeacher && (<button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-black border border-slate-200 rounded-lg hover:border-indigo-600 transition-all uppercase tracking-wider">Seç</button>)}</div></div>))}</div>)}
      </Dialog>

      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto no-scrollbar py-1">
             <div className="flex items-center gap-3 p-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500">{user?.name ? user.name.charAt(0).toUpperCase() : 'E'}</div>
                <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-[13px] leading-none mb-1">{user?.name || 'Eğitmen'}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
                </div>
             </div>
             <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Okul Yapılandırması</h4>
                 <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-3">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0"><GraduationCap size={16} /></div>
                         <input type="text" value={state.schoolName} onChange={(e) => actions.updateSchoolName(e.target.value)} className="flex-1 bg-transparent border-none font-bold text-slate-800 text-xs outline-none focus:text-indigo-600 transition-colors" placeholder="Okul Adı..." />
                     </div>
                     <div className="h-px bg-slate-50"></div>
                     <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 group">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:text-indigo-600 transition-colors"><ImageIcon size={16} /></div>
                         <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">Logo Değiştir</span>
                     </button>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
             </div>
             <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Özellikler</h4>
                 <button onClick={actions.toggleAutoProcessing} className="w-full flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}><Zap size={16} fill={state.autoLessonProcessing ? "currentColor" : "none"} /></div>
                        <span className={`font-bold text-xs ${state.autoLessonProcessing ? 'text-slate-800' : 'text-slate-500'}`}>Otomatik Borçlandır</span>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${state.autoLessonProcessing ? 'translate-x-4' : 'translate-x-0'}`}></div></div>
                 </button>
             </div>
             <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Görünüm</h4>
                 <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm"><div className="grid grid-cols-5 gap-2">{THEME_OPTIONS.map(theme => (<button key={theme.key} onClick={() => actions.updateThemeColor(theme.key)} className={`aspect-square rounded-full border-2 transition-all ${state.themeColor === theme.key ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent opacity-60'}`} style={{ backgroundColor: theme.color }} />))}</div></div>
             </div>
             <div className="pt-2">
                 <button onClick={logout} className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] active:scale-95 transition-all uppercase tracking-widest"><LogOut size={16} /> Oturumu Kapat</button>
             </div>
        </div>
      </Dialog>
    </div>
  );
};
