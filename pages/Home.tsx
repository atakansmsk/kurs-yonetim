
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
// Fix: Added missing Users and LogOut icon imports from lucide-react
import { 
  UserPlus, 
  Settings, 
  Zap, 
  GraduationCap, 
  ChevronRight, 
  Share2, 
  Clock,
  Coffee,
  CalendarDays,
  Forward,
  ImageIcon,
  TrendingUp,
  LayoutGrid,
  Sun,
  Flame,
  Calendar,
  Sparkles,
  Users,
  LogOut
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
      
      {/* 1. REFINED HEADER */}
      <div className="px-7 pt-10 pb-6 flex items-start justify-between">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 text-[9px] font-black rounded-md uppercase tracking-wider">{todaysData.dayName}</span>
                <span className="text-[10px] font-bold text-slate-300">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Merhaba, <span className="text-indigo-600">{userName}</span>
             </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className={`w-12 h-12 rounded-[1.25rem] border flex items-center justify-center transition-all active:scale-90 relative ${isRecovered ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}
          >
            <Settings size={22} strokeWidth={1.5} />
            {state.autoLessonProcessing && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>}
          </button>
      </div>

      {/* 2. DYNAMIC WELCOME (Only if day hasn't started) */}
      {!todaysData.dayStarted && todaysData.firstLesson && (
          <div className="px-7 mb-8">
              <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-[2rem] p-6 flex items-center gap-5 shadow-sm">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-md shadow-indigo-100/50 shrink-0">
                      <Sun size={28} strokeWidth={2} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">GÜNÜN İLK DERSİ</p>
                      <h3 className="text-[13px] font-bold text-slate-800 leading-snug">
                          Bugün maraton saat <span className="text-indigo-600 font-black">{todaysData.firstLesson.start}</span>'da <span className="text-indigo-600 font-black">{state.students[todaysData.firstLesson.studentId!]?.name}</span> ile başlıyor. Hazır mıyız?
                      </h3>
                  </div>
              </div>
          </div>
      )}

      {/* 3. HERO: LIVE STATUS */}
      <div className="px-7 mb-10">
          {todaysData.statusType === 'IN_LESSON' ? (
              <div className="bg-slate-950 rounded-[3rem] p-8 shadow-2xl shadow-indigo-950/20 flex flex-col gap-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
                  {/* Decorative mesh */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-600/10 rounded-full blur-[60px] pointer-events-none"></div>

                  <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-indigo-500/20 rounded-full">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.3em]">CANLI DERS</span>
                      </div>
                      <div className="bg-white/5 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-indigo-100 tracking-tighter">{todaysData.currentSlot?.start} — {todaysData.currentSlot?.end}</span>
                      </div>
                  </div>
                  
                  <div className="flex items-end justify-between gap-6 relative z-10">
                      <div className="flex-1 min-w-0">
                          <h2 className="text-4xl font-black text-white truncate tracking-tighter leading-none mb-4">
                              {state.students[todaysData.currentSlot!.studentId!]?.name}
                          </h2>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/10">
                             <Sparkles size={14} className="text-indigo-400" />
                             <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Öğrenci Aktif</span>
                          </div>
                      </div>
                      <div className="text-right shrink-0">
                          <div className="text-5xl font-black text-white leading-none tracking-tighter drop-shadow-lg">{todaysData.timeLeft}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase mt-3 tracking-[0.2em]">DAKİKA</div>
                      </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.4)]" style={{ width: `${todaysData.progress}%` }}></div>
                      </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-4">
                           <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5"><Forward size={18} strokeWidth={2} /></div>
                           <div>
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">SIRADAKİ</span>
                               <span className="text-sm font-bold text-slate-100">
                                   {todaysData.nextSlot ? (state.students[todaysData.nextSlot.studentId!]?.name || "Boş Saat") : "Gün Sonu"}
                               </span>
                           </div>
                       </div>
                       {todaysData.gapToNext > 0 && (
                            <div className="bg-amber-500/10 text-amber-500 px-4 py-2.5 rounded-[1.25rem] border border-amber-500/10 flex items-center gap-2.5">
                                <Clock size={14} strokeWidth={2.5} />
                                <span className="text-xs font-black tracking-tight">{todaysData.gapToNext} DK ARA</span>
                            </div>
                       )}
                  </div>
              </div>
          ) : todaysData.statusType === 'BREAK' ? (
              <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl shadow-slate-200/40 flex flex-col gap-7 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-[60px] pointer-events-none"></div>

                  <div className="flex items-center justify-between relative z-10">
                      <div className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl flex items-center gap-3">
                          <Coffee size={20} strokeWidth={2.5} className="animate-bounce" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">DERS ARASI ☕</span>
                      </div>
                  </div>
                  
                  <div className="flex items-end justify-between relative z-10">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">GELECEK ÖĞRENCİ</p>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{state.students[todaysData.nextSlot!.studentId!]?.name || "Boş Ders"}</h2>
                      </div>
                      <div className="text-right">
                          <p className="text-4xl font-black text-indigo-600 leading-none tracking-tighter">{todaysData.timeLeft}</p>
                          <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest">DK SONRA</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-[1.75rem] border border-slate-100 relative z-10 backdrop-blur-sm">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-50"><Clock size={24} /></div>
                      <p className="text-sm font-bold text-slate-600 tracking-tight leading-relaxed flex-1">
                        Kısa bir mola! Bir sonraki ders <span className="text-indigo-600 font-black">{todaysData.nextSlot?.start}</span>'da başlayacak.
                      </p>
              </div>
          </div>
          ) : (
              <div className="bg-slate-50 border border-slate-100 border-dashed rounded-[3rem] p-14 flex flex-col items-center gap-6 opacity-80 animate-in fade-in duration-1000">
                  <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-slate-300 border border-slate-50"><Coffee size={44} /></div>
                  <div className="text-center space-y-3">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] block">MESAİ BİTTİ</span>
                    <span className="text-xs font-bold text-slate-400 block max-w-[200px] leading-relaxed mx-auto">Bugün için planlanan derslerin tamamı işlendi. Yarın görüşmek üzere!</span>
                  </div>
              </div>
          )}
      </div>

      {/* 4. REFINED DASHBOARD PILL */}
      <div className="px-7 mb-10">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-[1.5rem] bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Flame size={26} strokeWidth={2} />
                  </div>
                  <div>
                      <h4 className="text-[15px] font-black text-slate-900 leading-none">Bugünün Özeti</h4>
                      <p className="text-xs font-bold text-slate-400 mt-2">Toplam <span className="text-orange-600 font-black">{todaysData.lessonCount} Seans</span> Var</p>
                  </div>
              </div>
              <div className="flex items-center -space-x-3">
                  {[...Array(Math.min(todaysData.lessonCount, 3))].map((_, i) => (
                      <div key={i} className="w-9 h-9 rounded-full bg-slate-100 border-[3px] border-white flex items-center justify-center overflow-hidden">
                          <Users size={16} className="text-slate-400" />
                      </div>
                  ))}
                  {todaysData.lessonCount > 3 && (
                      <div className="w-9 h-9 rounded-full bg-indigo-600 border-[3px] border-white flex items-center justify-center text-[11px] font-black text-white shadow-sm">
                          +{todaysData.lessonCount - 3}
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* 5. QUICK ACTIONS: REFINED GRID */}
      <div className="px-7 space-y-4 mb-14">
          <button 
              onClick={() => onNavigate('SCHEDULE')} 
              className="w-full bg-slate-950 p-6 rounded-[2rem] shadow-2xl shadow-slate-200 flex items-center justify-between group active:scale-[0.98] transition-all border border-slate-800"
          >
              <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg shadow-indigo-600/30">
                      <CalendarDays size={28} strokeWidth={2} />
                  </div>
                  <div className="text-left space-y-1.5">
                      <h4 className="font-black text-white text-lg tracking-tight leading-none">Haftalık Program</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">TAKVİMİ YÖNET</p>
                  </div>
              </div>
              <ChevronRight size={22} className="text-slate-700 group-hover:translate-x-1.5 transition-transform" />
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIsTeachersListOpen(true)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all group">
                 <div className="w-11 h-11 rounded-[1.15rem] bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm"><GraduationCap size={22} strokeWidth={2} /></div>
                 <span className="font-black text-slate-900 text-[11px] uppercase tracking-widest">KADRO</span>
            </button>
            <button onClick={() => onNavigate('WEEKLY')} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-95 transition-all group">
                 <div className="w-11 h-11 rounded-[1.15rem] bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><LayoutGrid size={22} strokeWidth={2} /></div>
                 <span className="font-black text-slate-900 text-[11px] uppercase tracking-widest">ÖZET</span>
            </button>
          </div>
      </div>

      {/* FOOTER DECOR */}
      <div className="px-7 text-center opacity-25 pb-36">
          <div className="w-full h-px bg-slate-200 mb-8"></div>
          <span className="text-[9px] font-black tracking-[0.6em] text-slate-400 uppercase">KURS YÖNETİM PRO</span>
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
                 <button onClick={actions.forceSync} className="w-full mb-2 py-3 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] active:scale-95 transition-all uppercase tracking-widest">Buluta Zorla Senkron Et</button>
                 <button onClick={logout} className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] active:scale-95 transition-all uppercase tracking-widest"><LogOut size={16} /> Oturumu Kapat</button>
             </div>
        </div>
      </Dialog>
    </div>
  );
};
