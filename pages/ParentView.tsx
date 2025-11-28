
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { CheckCircle2, Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Calendar, Palette, Music, BookOpen, Trophy, Activity, Link, Youtube, FileText, Image, ChevronRight, PlayCircle } from 'lucide-react';

interface ParentViewProps {
  teacherId: string;
  studentId: string;
}

const ICONS: Record<string, React.ElementType> = {
  'sparkles': Sparkles,
  'palette': Palette,
  'music': Music,
  'book': BookOpen,
  'trophy': Trophy,
  'activity': Activity
};

export const ParentView: React.FC<ParentViewProps> = ({ teacherId, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ student: Student, appState: AppState } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schoolData = await DataService.getPublicSchoolData(teacherId);
        
        if (!schoolData) {
          setError("Kurum verisine ulaşılamadı.");
          return;
        }

        const student = schoolData.students[studentId];
        if (!student) {
          setError("Öğrenci kaydı bulunamadı veya silinmiş.");
          return;
        }

        setData({ student, appState: schoolData });
      } catch (err) {
        console.error(err);
        setError("Veri yüklenirken bağlantı hatası oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, studentId]);

  // --- SAFE DATA HANDLING ---
  const student = data?.student;
  const appState = data?.appState;

  const {
      nextLesson,
      lastPaymentStr,
      nextPaymentStr,
      currentPeriodHistory,
      SchoolIcon,
      isCustomLogo
  } = useMemo(() => {
      if (!student || !appState) return { 
          nextLesson: null, lastPaymentStr: "-", nextPaymentStr: "-", currentPeriodHistory: [], 
          SchoolIcon: Sparkles, isCustomLogo: false 
      };

      // Logo Logic
      const customLogo = appState.schoolIcon.startsWith('data:');
      const IconComp = !customLogo ? (ICONS[appState.schoolIcon] || Sparkles) : Sparkles;

      // 1. Next Lesson Logic
      const getNextLesson = () => {
        const today = new Date();
        const dayIndex = today.getDay(); // 0=Pazar
        const daysMap = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt"];
        
        for (let i = 0; i < 7; i++) {
            const checkDayIndex = (dayIndex + i) % 7;
            const dayName = daysMap[checkDayIndex];
            const key = `${appState.currentTeacher}|${dayName}`;
            const slots = appState.schedule[key] || [];
            const foundSlot = slots.find(s => s.studentId === student.id);
            if (foundSlot) {
                return { day: dayName, time: `${foundSlot.start} - ${foundSlot.end}` };
            }
        }
        return null;
      };

      // 2. History Processing
      const safeHistory = student.history || [];
      const allHistorySorted = [...safeHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 3. Payment Logic
      const lastPaymentTx = allHistorySorted.find(tx => 
          !tx.isDebt && 
          !tx.note.includes("Telafi") && 
          !tx.note.includes("Deneme") &&
          !tx.note.includes("Ders")
      );
      
      let lastPaymentDateStr = "Henüz Yok";
      let nextPaymentDateStr = "-";
      let lastPaymentDateObj: Date | null = null;

      if (lastPaymentTx) {
          lastPaymentDateObj = new Date(lastPaymentTx.date);
          lastPaymentDateStr = lastPaymentDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      } else if (student.registrationDate) {
          lastPaymentDateObj = new Date(student.registrationDate);
      }

      if (lastPaymentDateObj) {
          const nextDate = new Date(lastPaymentDateObj);
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextPaymentDateStr = nextDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      }

      // 4. Filter History (Show only AFTER last payment)
      let filteredHistory = allHistorySorted;
      if (lastPaymentTx) {
          const paymentTime = new Date(lastPaymentTx.date).getTime();
          filteredHistory = allHistorySorted.filter(tx => new Date(tx.date).getTime() > paymentTime);
      }

      return {
          nextLesson: getNextLesson(),
          lastPaymentStr: lastPaymentDateStr,
          nextPaymentStr: nextPaymentDateStr,
          currentPeriodHistory: filteredHistory,
          SchoolIcon: IconComp,
          isCustomLogo: customLogo
      };

  }, [student, appState]);


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium text-xs">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !student || !appState) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
          <XCircle size={24} />
        </div>
        <h3 className="text-base font-bold text-slate-800">Erişim Hatası</h3>
        <p className="text-slate-500 text-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-indigo-100 pb-32">
      
      {/* --- HERO SECTION --- */}
      <div className="relative bg-gradient-to-b from-white to-[#F8FAFC]">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-64 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative px-6 pt-12 pb-8 flex flex-col items-center">
            {/* LOGO CARD */}
            <div className="w-28 h-28 bg-white rounded-[2rem] shadow-2xl shadow-indigo-100 flex items-center justify-center p-4 mb-6 ring-4 ring-white relative z-10 animate-scale-in">
                {isCustomLogo ? (
                    <img src={appState.schoolIcon} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                    <SchoolIcon size={48} className="text-indigo-600" strokeWidth={1.5} />
                )}
            </div>

            {/* STUDENT IDENTITY CARD (Glass) */}
            <div className="w-full max-w-sm bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold shadow-lg shadow-slate-300">
                        {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight">{student.name}</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Aktif Öğrenci</span>
                        </div>
                    </div>
                </div>
                {student.debtLessonCount > 0 && (
                    <div className="text-center">
                        <div className="text-2xl font-black text-indigo-600 leading-none">{student.debtLessonCount}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Ders</div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 space-y-6">
        
        {/* --- NEXT LESSON CARD (Premium Dark) --- */}
        <div className="group relative bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200 overflow-hidden cursor-default transition-transform active:scale-[0.99]">
            {/* Glow Effects */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/30 rounded-full blur-[60px] -mr-10 -mt-10 group-hover:bg-indigo-500/40 transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 opacity-60">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sıradaki Ders</span>
                </div>
                
                {nextLesson ? (
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-3xl font-black tracking-tighter mb-1">{nextLesson.day}</div>
                            <div className="text-lg font-medium text-indigo-200">{nextLesson.time}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <ChevronRight size={20} />
                        </div>
                    </div>
                ) : (
                    <div className="py-2">
                        <div className="text-xl font-bold opacity-90">Planlanmış ders yok.</div>
                        <p className="text-xs text-slate-400 mt-1">Yeni program için eğitmenle görüşünüz.</p>
                    </div>
                )}
            </div>
        </div>

        {/* --- PAYMENT STATUS (Compact) --- */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">SON ÖDEME</p>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-bold text-slate-700">{lastPaymentStr}</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1">GELECEK ÖDEME</p>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    <span className="text-sm font-bold text-slate-700">{nextPaymentStr}</span>
                </div>
            </div>
        </div>

        {/* --- TIMELINE HISTORY --- */}
        <div>
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">DÖNEM HAREKETLERİ</h3>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">Son Kayıtlar</span>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-2">
                {currentPeriodHistory.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <Layers size={20} />
                        </div>
                        <p className="text-slate-900 font-bold text-sm">Yeni Dönem</p>
                        <p className="text-slate-400 text-xs mt-1">Son ödemeden sonra henüz işlem yok.</p>
                    </div>
                ) : (
                    <div className="relative pl-6 pt-2 pb-2 space-y-6">
                        {/* Vertical Timeline Line */}
                        <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-slate-100 rounded-full"></div>

                        {currentPeriodHistory.map((tx, idx) => {
                            const dateObj = new Date(tx.date);
                            const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                            const time = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            
                            let statusText = "Ders Yapıldı";
                            let statusColor = "text-slate-700";
                            let dotColor = "bg-indigo-500";
                            
                            if (tx.note.includes("Telafi")) {
                                statusText = "Telafi Dersi"; statusColor = "text-orange-600"; dotColor = "bg-orange-500";
                            } else if (tx.note.includes("Deneme")) {
                                statusText = "Deneme Dersi"; statusColor = "text-purple-600"; dotColor = "bg-purple-500";
                            } else if (tx.note.includes("Gelmedi")) {
                                statusText = "Gelmedi"; statusColor = "text-red-600"; dotColor = "bg-red-500";
                            } else if (!tx.isDebt) {
                                statusText = "Ödeme Alındı"; statusColor = "text-emerald-600"; dotColor = "bg-emerald-500";
                            }

                            return (
                                <div key={tx.id} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[16px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${dotColor} group-hover:scale-125 transition-transform`}></div>
                                    
                                    <div className="flex justify-between items-start pr-2">
                                        <div>
                                            <div className={`text-sm font-bold ${statusColor}`}>{statusText}</div>
                                            <div className="text-[11px] font-medium text-slate-400 mt-0.5">{day} • {time}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* --- HOMEWORK & RESOURCES --- */}
        {(student.resources || []).length > 0 && (
            <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1 mt-6">ÖDEVLER & MATERYALLER</h3>
                <div className="grid grid-cols-1 gap-3">
                    {student.resources.map(res => (
                        <a 
                            key={res.id} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all hover:border-indigo-200 hover:shadow-md"
                        >
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105 ${
                                res.type === 'VIDEO' ? 'bg-gradient-to-br from-red-500 to-rose-600' : 
                                res.type === 'PDF' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 
                                res.type === 'IMAGE' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 
                                'bg-gradient-to-br from-slate-700 to-slate-800'
                            }`}>
                                {res.type === 'VIDEO' ? <PlayCircle size={24} fill="rgba(255,255,255,0.2)" /> : 
                                 res.type === 'PDF' ? <FileText size={24} /> : 
                                 res.type === 'IMAGE' ? <Image size={24} /> : <Link size={24} />}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">{res.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 uppercase tracking-wider">{res.type === 'LINK' ? 'BAĞLANTI' : res.type}</span>
                                    <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Aç <ChevronRight size={10}/></span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 opacity-40">
            <div className="inline-flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-slate-100">
                <Sparkles size={10} className="text-indigo-400" />
                <span>Powered by Kurs Pro</span>
            </div>
        </div>

      </div>
    </div>
  );
};
