
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
/* Import WeekDay and Student types from types */
import { WeekDay, Student } from '../types';
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
  LogOut,
  Info,
  Minimize2,
  Monitor,
  Timer,
  Plus,
  Minus,
  RotateCcw,
  Play,
  Search,
  UserCheck
} from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface HomeProps {
  onNavigate: (tab: 'SCHEDULE' | 'STUDENTS' | 'WEEKLY') => void;
  onToggleWidget?: () => void;
  isWidgetMode?: boolean;
}

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const Home: React.FC<HomeProps> = ({ onNavigate, onToggleWidget, isWidgetMode }) => {
  const { state, actions, isRecovered } = useCourse();
  const { logout, user } = useAuth();
  
  const [isTeachersListOpen, setIsTeachersListOpen] = useState(false);
  const [isAddTeacherMode, setIsAddTeacherMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  
  // GEÇİCİ EK SÜRE (Programı bozmaz, sadece sayacı etkiler)
  const [bonusMinutes, setBonusMinutes] = useState(0);

  // ANLIK SEANS (Sadece Widget/Local state için)
  const [freeSessionEnd, setFreeSessionEnd] = useState<number | null>(null);
  const [freeSessionStudentName, setFreeSessionStudentName] = useState<string>("");

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
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
    
    // Önce programdaki dersi kontrol et
    let currentSlot = slots.find(s => timeToMinutes(s.start) <= currentMins && (timeToMinutes(s.end) + bonusMinutes) > currentMins);
    const nextSlot = slots.find(s => timeToMinutes(s.start) > currentMins && s.studentId);
    
    let statusType: 'IN_LESSON' | 'BREAK' | 'IDLE' | 'FREE_SESSION' = 'IDLE';
    let timeLeft = 0;
    let progress = 0;

    // Eğer programda ders varsa
    if (currentSlot && currentSlot.studentId) {
        statusType = 'IN_LESSON';
        const start = timeToMinutes(currentSlot.start);
        const endWithBonus = timeToMinutes(currentSlot.end) + bonusMinutes;
        timeLeft = endWithBonus - currentMins;
        progress = Math.min(((currentMins - start) / (endWithBonus - start)) * 100, 100);
    } 
    // Eğer programda ders yok ama "Anlık Seans" aktifse
    else if (freeSessionEnd && freeSessionEnd > currentMins) {
        statusType = 'FREE_SESSION';
        timeLeft = freeSessionEnd - currentMins;
        progress = Math.min(((40 - timeLeft) / 40) * 100, 100);
    }
    else {
        if (bonusMinutes !== 0) {
            setTimeout(() => setBonusMinutes(0), 100);
        }
        if (freeSessionEnd) {
            setTimeout(() => {
                setFreeSessionEnd(null);
                setFreeSessionStudentName("");
            }, 100);
        }
        if (nextSlot) {
            statusType = 'BREAK';
            timeLeft = timeToMinutes(nextSlot.start) - currentMins;
        }
    }

    return { 
        statusType, 
        currentSlot, 
        nextSlot, 
        timeLeft, 
        progress, 
        lessonCount: activeLessons.length,
        dayName
    };
  }, [state.schedule, state.currentTeacher, currentTime, state.students, bonusMinutes, freeSessionEnd]);

  // MASAÜSTÜ WIDGET (PIP) MANTIĞI
  const openDesktopWidget = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert("Tarayıcınız masaüstü widget özelliğini desteklemiyor.");
      return;
    }

    try {
      // @ts-ignore
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 360,
        height: 240,
      });

      // Ensure full height for scrolling context
      pipWindow.document.documentElement.style.height = '100%';
      pipWindow.document.body.style.height = '100%';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.padding = '0';

      // Fontları ve Stilleri kopyala
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = pipWindow.document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = pipWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      const container = pipWindow.document.createElement('div');
      container.id = 'pip-root';
      container.className = "h-full w-full bg-slate-950 overflow-hidden flex flex-col font-sans selection:bg-indigo-500/30";
      pipWindow.document.body.append(container);

      let localBonus = bonusMinutes;
      let localFreeEnd = freeSessionEnd;
      let localFreeStudentName = freeSessionStudentName;
      let isSelectingStudent = false;

      const updatePipUI = () => {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const dayName = jsDayToAppKey[now.getDay()];
        const key = `${state.currentTeacher}|${dayName}`;
        const slots = (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
        
        let cSlot = slots.find(s => timeToMinutes(s.start) <= currentMins && (timeToMinutes(s.end) + localBonus) > currentMins);
        const nSlot = slots.find(s => timeToMinutes(s.start) > currentMins && s.studentId);
        
        let sType: 'IN_LESSON' | 'BREAK' | 'IDLE' | 'FREE_SESSION' = 'IDLE';
        let tLeft = 0;
        let prog = 0;
        
        if (cSlot && cSlot.studentId) {
            sType = 'IN_LESSON';
            const endWithB = timeToMinutes(cSlot.end) + localBonus;
            tLeft = endWithB - currentMins;
            prog = Math.min(((currentMins - timeToMinutes(cSlot.start)) / (endWithB - timeToMinutes(cSlot.start))) * 100, 100);
        } else if (localFreeEnd && localFreeEnd > currentMins) {
            sType = 'FREE_SESSION';
            tLeft = localFreeEnd - currentMins;
            prog = Math.min(((40 - tLeft) / 40) * 100, 100);
        } else if (nSlot) {
            sType = 'BREAK';
            tLeft = timeToMinutes(nSlot.start) - currentMins;
        }

        const currentName = (sType === 'IN_LESSON') ? (state.students[cSlot!.studentId!]?.name || "Öğrenci") : (sType === 'FREE_SESSION' ? localFreeStudentName : "Ders Arası");
        const nextName = (nSlot && nSlot.studentId) ? (state.students[nSlot.studentId]?.name || "Gün Sonu") : "Program Bitti";

        if (isSelectingStudent) {
            // ÖĞRENCİ SEÇİM EKRANI
            // Fix: Cast Object.values to Student[] to avoid 'unknown' type errors
            const activeStudents = (Object.values(state.students) as Student[]).filter(s => s.isActive !== false).sort((a, b) => a.name.localeCompare(b.name));
            
            container.innerHTML = `
              <div class="w-full h-full p-4 flex flex-col bg-slate-950 relative overflow-hidden">
                <div class="flex items-center justify-between mb-3 shrink-0 px-2">
                    <span class="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Kime Ders İşleniyor?</span>
                    <button id="pip-back" class="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </div>
                <div class="flex-1 overflow-y-auto min-h-0 space-y-1.5 px-2">
                    <button class="pip-student-item w-full p-3 rounded-xl bg-white/5 border border-white/5 text-left flex items-center gap-3 active:scale-95 transition-all group" data-id="none" data-name="Genel Seans">
                        <div class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">G</div>
                        <span class="text-sm font-bold text-white/90">Genel Seans (İsimsiz)</span>
                    </button>
                    ${activeStudents.map(s => `
                        <button class="pip-student-item w-full p-3 rounded-xl bg-white/5 border border-white/5 text-left flex items-center gap-3 active:scale-95 transition-all group" data-id="${s.id}" data-name="${s.name}">
                            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">${s.name.charAt(0)}</div>
                            <span class="text-sm font-bold text-white/90 truncate">${s.name}</span>
                        </button>
                    `).join('')}
                    <div class="h-4 w-full"></div> <!-- Extra padding for bottom scroll -->
                </div>
              </div>
            `;

            container.querySelector('#pip-back')?.addEventListener('click', () => {
                isSelectingStudent = false;
                updatePipUI();
            });

            container.querySelectorAll('.pip-student-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sid = (btn as HTMLElement).dataset.id;
                    const sname = (btn as HTMLElement).dataset.name || "Seans";
                    
                    if (sid && sid !== 'none') {
                        // Otomatik Borç Yaz
                        actions.addTransaction(sid, 'LESSON', now.toISOString());
                    }

                    localFreeStudentName = sname;
                    localFreeEnd = currentMins + 40;
                    setFreeSessionEnd(localFreeEnd);
                    setFreeSessionStudentName(sname);
                    
                    isSelectingStudent = false;
                    updatePipUI();
                });
            });

            return;
        }

        if (sType === 'IN_LESSON' || sType === 'FREE_SESSION') {
            container.innerHTML = `
              <div class="w-full h-full p-6 flex flex-col justify-between relative overflow-hidden bg-slate-950">
                <div class="absolute -top-24 -right-24 w-56 h-56 bg-indigo-600/10 rounded-full blur-[60px] pointer-events-none"></div>

                <div class="flex items-center justify-between relative z-10">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 ${sType === 'FREE_SESSION' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'} rounded-full animate-pulse"></div>
                        <span class="text-[10px] font-black ${sType === 'FREE_SESSION' ? 'text-emerald-300' : 'text-indigo-300'} tracking-[0.2em] uppercase">${sType === 'FREE_SESSION' ? 'ANLIK SEANS' : 'CANLI DERS'}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button id="pip-reset" class="bg-white/5 hover:bg-white/10 text-white p-1.5 rounded-lg border border-white/10 transition-all active:scale-90" title="Sıfırla"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg></button>
                      <div class="flex bg-white/5 rounded-lg border border-white/5 p-0.5">
                        <button id="pip-minus" class="px-2 py-1 text-slate-400 hover:text-white transition-colors active:scale-90"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                        <button id="pip-add" class="px-2 py-1 bg-indigo-600/80 text-white text-[9px] font-black rounded-md transition-all hover:bg-indigo-600 active:scale-95 shadow-lg shadow-indigo-600/20">+10 DK</button>
                      </div>
                    </div>
                </div>

                <div class="flex items-end justify-between relative z-10 my-1">
                    <h2 class="text-[28px] font-black text-white truncate flex-1 tracking-tighter leading-none">${currentName}</h2>
                    <div class="text-right shrink-0">
                        <div class="text-5xl font-black text-white leading-none tracking-tighter">${tLeft}</div>
                        <div class="text-[9px] font-black text-slate-500 uppercase mt-1 tracking-widest">DK</div>
                    </div>
                </div>

                <div class="space-y-3 relative z-10">
                    <div class="h-1 bg-white/5 rounded-full overflow-hidden p-0">
                        <div class="h-full ${sType === 'FREE_SESSION' ? 'bg-emerald-500' : 'bg-indigo-500'} rounded-full transition-all duration-1000" style="width: ${prog}%"></div>
                    </div>
                    
                    <div class="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                        <div class="flex items-center justify-between">
                            <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">SIRADAKİ</span>
                            <span class="text-[9px] font-bold text-slate-400">${sType === 'IN_LESSON' ? (cSlot?.start + ' — ' + cSlot?.end) : 'Anlık Çalışma'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                             <span class="text-sm font-black text-white/90 truncate max-w-[200px] tracking-tight">${nextName}</span>
                             ${localBonus > 0 || sType === 'FREE_SESSION' ? `<span class="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black rounded uppercase tracking-tighter shadow-[0_0_10px_rgba(99,102,241,0.1)]">+${localBonus || (localFreeEnd! - currentMins - 40)} DK</span>` : ''}
                        </div>
                    </div>
                </div>
              </div>
            `;
            
            container.querySelector('#pip-add')?.addEventListener('click', () => {
              if (sType === 'FREE_SESSION') {
                  localFreeEnd! += 10;
                  setFreeSessionEnd(localFreeEnd);
              } else {
                  localBonus += 10;
                  setBonusMinutes(prev => prev + 10);
              }
              updatePipUI();
            });
            container.querySelector('#pip-minus')?.addEventListener('click', () => {
              if (sType === 'FREE_SESSION') {
                  localFreeEnd! -= 10;
                  setFreeSessionEnd(localFreeEnd);
              } else if (localBonus >= 10) {
                  localBonus -= 10;
                  setBonusMinutes(prev => Math.max(0, prev - 10));
              }
              updatePipUI();
            });
            container.querySelector('#pip-reset')?.addEventListener('click', () => {
              localBonus = 0;
              localFreeEnd = null;
              localFreeStudentName = "";
              setBonusMinutes(0);
              setFreeSessionEnd(null);
              setFreeSessionStudentName("");
              updatePipUI();
            });
        } else {
            container.innerHTML = `
              <div class="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-slate-950 relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-slate-950"></div>
                <div class="relative z-10 flex flex-col items-center gap-4 w-full">
                    <div class="flex flex-col items-center">
                        <h2 class="text-xl font-black text-white/90 tracking-tight">Ders Arası</h2>
                        <div class="flex flex-col gap-1 mt-2">
                            <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">SIRADAKİ</span>
                            <span class="text-base font-black text-indigo-400">${nextName}</span>
                        </div>
                    </div>
                    
                    <button id="pip-start-lesson" class="mt-2 w-full max-w-[200px] py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center justify-center gap-2 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 group shadow-lg shadow-indigo-600/20">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="group-hover:scale-110 transition-transform"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        Ders Başlat
                    </button>

                    ${tLeft > 0 ? `<div class="mt-1 text-[10px] font-black text-white/20 tracking-widest">${tLeft} DK SONRA DERSİN VAR</div>` : ''}
                </div>
              </div>
            `;

            container.querySelector('#pip-start-lesson')?.addEventListener('click', () => {
                isSelectingStudent = true;
                updatePipUI();
            });
        }
      };

      updatePipUI();
      const pipInterval = setInterval(updatePipUI, 10000);
      pipWindow.addEventListener('pagehide', () => clearInterval(pipInterval));

    } catch (err) {
      console.error("PiP error:", err);
      alert("Pencere açılırken bir hata oluştu.");
    }
  };

  const handleSaveTeacher = () => {
    if (newTeacherName.trim()) {
      actions.addTeacher(newTeacherName.trim());
      setNewTeacherName("");
      setIsAddTeacherMode(false);
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

  const userName = user?.name ? user.name.split(' ')[0] : "Eğitmen";

  return (
    <div className="flex flex-col h-full bg-[#FBFBFC] overflow-y-auto no-scrollbar scroll-smooth">
      
      {/* 1. HEADER */}
      <div className="px-7 pt-10 pb-4 flex items-start justify-between">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 text-[9px] font-black rounded-md uppercase tracking-wider">{todaysData.dayName}</span>
                <span className="text-[10px] font-bold text-slate-300">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Merhaba, <span className="text-indigo-600">{userName}</span>
             </h1>
             {/* EĞİTMEN SEÇİCİ */}
             <button 
                onClick={() => setIsTeachersListOpen(true)}
                className="mt-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm flex items-center gap-2 group active:scale-95 transition-all"
             >
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{state.currentTeacher}</span>
                <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
             </button>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className={`w-12 h-12 rounded-[1.25rem] border flex items-center justify-center transition-all active:scale-90 relative ${isRecovered ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}
          >
            <Settings size={22} strokeWidth={1.5} />
            {state.autoLessonProcessing && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>}
          </button>
      </div>

      {/* 2. HERO: LIVE STATUS */}
      <div className="px-7 mb-10">
          {(todaysData.statusType === 'IN_LESSON' || todaysData.statusType === 'FREE_SESSION') ? (
              <div className={`rounded-[3rem] p-8 shadow-2xl flex flex-col gap-8 relative overflow-hidden animate-in fade-in duration-700 ${todaysData.statusType === 'FREE_SESSION' ? 'bg-slate-900 shadow-emerald-950/10' : 'bg-slate-950 shadow-indigo-950/20'}`}>
                  <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none ${todaysData.statusType === 'FREE_SESSION' ? 'bg-emerald-600/10' : 'bg-indigo-600/20'}`}></div>

                  <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${todaysData.statusType === 'FREE_SESSION' ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}>
                            <div className={`w-2 h-2 rounded-full animate-ping ${todaysData.statusType === 'FREE_SESSION' ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${todaysData.statusType === 'FREE_SESSION' ? 'text-emerald-300' : 'text-indigo-300'}`}>
                            {todaysData.statusType === 'FREE_SESSION' ? 'ANLIK SEANS' : 'CANLI DERS'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {/* GEÇİCİ SÜRE YÖNETİMİ */}
                        <div className="bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/5 flex items-center gap-1">
                            {(bonusMinutes > 0 || todaysData.statusType === 'FREE_SESSION') && (
                                <button 
                                    onClick={() => { setBonusMinutes(0); setFreeSessionEnd(null); setFreeSessionStudentName(""); }}
                                    className="w-8 h-8 rounded-xl bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-300 transition-colors"
                                    title="Sıfırla"
                                >
                                    <RotateCcw size={14} strokeWidth={3} />
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    if (todaysData.statusType === 'FREE_SESSION') {
                                        setFreeSessionEnd(prev => (prev || 0) + 10);
                                    } else {
                                        setBonusMinutes(prev => prev + 10);
                                    }
                                }}
                                className={`px-3 h-8 rounded-xl text-white text-[10px] font-black uppercase tracking-tight shadow-lg flex items-center gap-1.5 transition-all active:scale-95 ${todaysData.statusType === 'FREE_SESSION' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}
                                title="Sayaca 10 Dakika Ekle"
                            >
                                <Timer size={14} />
                                +10 DK
                            </button>
                        </div>
                        <button 
                            onClick={openDesktopWidget}
                            className="bg-white/5 hover:bg-white/10 backdrop-blur-xl p-2 rounded-xl border border-white/5 text-indigo-200 transition-all flex items-center"
                            title="Masaüstü Widget"
                        >
                            <Monitor size={16} />
                        </button>
                      </div>
                  </div>
                  
                  <div className="flex items-end justify-between gap-6 relative z-10">
                      <div className="flex-1 min-w-0">
                          <h2 className="text-4xl font-black text-white truncate tracking-tighter leading-none mb-4">
                              {todaysData.statusType === 'FREE_SESSION' ? freeSessionStudentName : (state.students[todaysData.currentSlot!.studentId!]?.name)}
                          </h2>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${todaysData.statusType === 'FREE_SESSION' ? 'bg-emerald-500/10 border-emerald-500/10' : 'bg-indigo-500/10 border-indigo-500/10'}`}>
                             <span className={`text-[10px] font-black uppercase tracking-widest ${todaysData.statusType === 'FREE_SESSION' ? 'text-emerald-300' : 'text-indigo-300'}`}>
                                {bonusMinutes > 0 || todaysData.statusType === 'FREE_SESSION' ? `EK SÜRE AKTİF` : 'PROGRAMDAKİ SÜRE'}
                             </span>
                          </div>
                      </div>
                      <div className="text-right shrink-0">
                          <div className="text-5xl font-black text-white leading-none tracking-tighter drop-shadow-lg">{todaysData.timeLeft}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase mt-3 tracking-[0.2em]">DAKİKA KALDI</div>
                      </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${todaysData.statusType === 'FREE_SESSION' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300'}`} style={{ width: `${todaysData.progress}%` }}></div>
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
                       <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                            <span className="text-xs font-black text-indigo-100 tracking-tighter">
                                {todaysData.statusType === 'FREE_SESSION' ? 'ANLIK WIDGET DERSİ' : `PROGRAM: ${todaysData.currentSlot?.start} — ${todaysData.currentSlot?.end}`}
                            </span>
                        </div>
                  </div>
              </div>
          ) : (
              <div className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-xl shadow-slate-200/40 flex flex-col gap-7 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-[60px] pointer-events-none"></div>

                  <div className="flex items-center justify-between relative z-10">
                      <div className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl flex items-center gap-3">
                          <Coffee size={20} strokeWidth={2.5} className="animate-bounce" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">DERS ARASI ☕</span>
                      </div>
                      <button onClick={openDesktopWidget} className="bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-100 text-slate-400">
                          <Monitor size={16} />
                      </button>
                  </div>
                  
                  <div className="flex items-end justify-between relative z-10">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">SIRADAKİ ÖĞRENCİ</p>
                          <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                              {todaysData.nextSlot ? (state.students[todaysData.nextSlot.studentId!]?.name || "Boş Ders") : "Gün Sonu"}
                          </h2>
                      </div>
                      <div className="text-right">
                          <p className="text-4xl font-black text-indigo-600 leading-none tracking-tighter">{todaysData.timeLeft}</p>
                          <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-widest">DK SONRA</p>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* 4. DASHBOARD PILL */}
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
          </div>
      </div>

      {/* 5. QUICK ACTIONS */}
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
            <button onClick={() => setIsTeachersListOpen(true)} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 active:scale-95 transition-all group">
                 <div className="w-11 h-11 rounded-[1.15rem] bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><GraduationCap size={22} strokeWidth={2} /></div>
                 <span className="font-black text-slate-900 text-[11px] uppercase tracking-widest">KADRO</span>
            </button>
            <button onClick={() => onNavigate('WEEKLY')} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 active:scale-95 transition-all group">
                 <div className="w-11 h-11 rounded-[1.15rem] bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><LayoutGrid size={22} strokeWidth={2} /></div>
                 <span className="font-black text-slate-900 text-[11px] uppercase tracking-widest">ÖZET</span>
            </button>
          </div>
      </div>

      {/* MODALS */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Eğitmen Ekle" : "Kadro"}
        actions={isAddTeacherMode ? (<><button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleSaveTeacher} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md">Ekle</button></>) : (<button onClick={() => setIsAddTeacherMode(true)} className="w-full py-4 bg-slate-900 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase tracking-widest"><UserPlus size={16} /> Yeni Eğitmen</button>)}>
          {isAddTeacherMode ? (<div className="py-2"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-indigo-500 outline-none" placeholder="Ad Soyad..." autoFocus /></div>) : (<div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">{state.teachers.map(teacher => (<div key={teacher} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${teacher === state.currentTeacher ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div><div><div className="font-black text-slate-800 text-sm">{teacher}</div><div className="text-[10px] font-bold text-slate-400 mt-0.5">Eğitmen</div></div></div><div className="flex items-center gap-2"><button onClick={(e) => handleShareTeacherLink(e, teacher)} className="p-2 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors"><Share2 size={16} /></button>{teacher !== state.currentTeacher && (<button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-black border border-slate-200 rounded-lg hover:border-indigo-600 transition-all uppercase tracking-wider">Seç</button>)}</div></div>))}</div>)}
      </Dialog>

      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="flex flex-col gap-5 py-1">
             <div className="flex items-center gap-3 p-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500">{user?.name ? user.name.charAt(0).toUpperCase() : 'E'}</div>
                <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-[13px] leading-none mb-1">{user?.name || 'Eğitmen'}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
                </div>
             </div>
             <button onClick={logout} className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-2 font-black text-[11px] active:scale-95 transition-all uppercase tracking-widest"><LogOut size={16} /> Oturumu Kapat</button>
        </div>
      </Dialog>
    </div>
  );
};
