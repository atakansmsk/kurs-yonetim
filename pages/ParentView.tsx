
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { CheckCircle2, Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Calendar, Palette, Music, BookOpen, Trophy, Activity, Link, Youtube, FileText, Image, ChevronRight, ExternalLink } from 'lucide-react';

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
      isCustomLogo,
      safeResources
  } = useMemo(() => {
      if (!student || !appState) return { 
          nextLesson: null, lastPaymentStr: "-", nextPaymentStr: "-", currentPeriodHistory: [], 
          SchoolIcon: Sparkles, isCustomLogo: false, safeResources: []
      };

      // Logo Logic
      const customLogo = appState.schoolIcon.startsWith('data:');
      const IconComp = !customLogo ? (ICONS[appState.schoolIcon] || Sparkles) : Sparkles;

      // Resources Safety Check
      const safeResources = Array.isArray(student.resources) ? student.resources : [];

      // 1. Next Lesson Logic
      const getNextLesson = () => {
        const today = new Date();
        const dayIndex = today.getDay(); // 0=Pazar
        // FULL DAY NAMES (Display)
        const daysMap = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        // DATA KEYS (App State uses Cmt)
        const appKeys = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt"];
        
        for (let i = 0; i < 7; i++) {
            const checkDayIndex = (dayIndex + i) % 7;
            const keyDayName = appKeys[checkDayIndex];
            const displayDayName = daysMap[checkDayIndex];
            
            const key = `${appState.currentTeacher}|${keyDayName}`;
            const slots = appState.schedule[key] || [];
            const foundSlot = slots.find(s => s.studentId === student.id);
            if (foundSlot) {
                return { day: displayDayName, time: `${foundSlot.start} - ${foundSlot.end}` };
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
          isCustomLogo: customLogo,
          safeResources
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
    // UPDATED: max-w-5xl applied for extra wide layout
    // UPDATED: pb-64 applied to ensure scrolling reaches the very bottom
    <div className="min-h-screen bg-[#F8FAFC] max-w-5xl mx-auto shadow-2xl overflow-hidden relative font-sans text-slate-800 selection:bg-indigo-100 pb-64">
      
      {/* --- HERO SECTION --- */}
      <div className="relative bg-gradient-to-b from-white to-[#F8FAFC] pb-4 pt-10 px-6 rounded-b-[2.5rem] shadow-sm mb-4 border-b border-slate-100">
        
        {/* HUGE LOGO AREA (Centered) - Height Reduced to h-28 */}
        <div className="flex justify-center mb-8">
            <div className="h-28 w-full max-w-[280px] flex items-center justify-center relative transition-transform hover:scale-105 duration-500">
                {isCustomLogo ? (
                    <img src={appState.schoolIcon} alt="Logo" className="h-full w-full object-contain drop-shadow-xl" />
                ) : (
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner">
                        <SchoolIcon size={48} strokeWidth={1.5} />
                    </div>
                )}
            </div>
        </div>

        {/* STUDENT IDENTITY CARD (Glass) - Width updated to max-w-4xl */}
        <div className="max-w-4xl mx-auto bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-lg shadow-indigo-100/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg font-bold shadow-md">
                    {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{student.name}</h1>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Aktif Öğrenci</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* CONTENT AREA - Width updated to max-w-5xl */}
      <div className="max-w-5xl mx-auto px-5 space-y-4">
        
        {/* --- NEXT LESSON CARD --- */}
        <div className="group relative bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl shadow-slate-200 overflow-hidden cursor-default transition-transform active:scale-[0.99]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/30 rounded-full blur-[60px] -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] -ml-10 -mb-10"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-60">
                    <Clock size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Sıradaki Ders</span>
                </div>
                
                {nextLesson ? (
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-2xl font-black tracking-tighter mb-0.5">{nextLesson.day}</div>
                            <div className="text-base font-medium text-indigo-200">{nextLesson.time}</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <ChevronRight size={20} />
                        </div>
                    </div>
                ) : (
                    <div className="py-1">
                        <div className="text-lg font-bold opacity-90">Planlanmış ders yok.</div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Yeni program için eğitmenle görüşünüz.</p>
                    </div>
                )}
            </div>
        </div>

        {/* --- PAYMENT STATUS (NO FEE DISPLAYED) --- */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SON ÖDEME</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-bold text-slate-700">{lastPaymentStr}</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">GELECEK ÖDEME</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-sm font-bold text-slate-700">{nextPaymentStr}</span>
                </div>
            </div>
            {student.debtLessonCount > 0 && (
                <div className="col-span-2 bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between px-5">
                    <div className="flex items-center gap-2">
                        <Layers size={16} className="text-indigo-400"/>
                        <span className="text-xs font-bold text-indigo-900">Bu Dönem İşlenen</span>
                    </div>
                    <span className="text-sm font-black text-indigo-600 bg-white px-3 py-1 rounded-lg shadow-sm">{student.debtLessonCount} Ders</span>
                </div>
            )}
        </div>

        {/* --- TIMELINE HISTORY --- */}
        <div>
            <div className="flex items-center justify-between mb-3 px-1 mt-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DÖNEM HAREKETLERİ</h3>
                <span className="text-[9px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-lg">Filtreli</span>
            </div>
            
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-3">
                {currentPeriodHistory.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                            <Layers size={18} />
                        </div>
                        <p className="text-slate-900 font-bold text-xs">Yeni Dönem</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Son ödemeden sonra henüz işlem yok.</p>
                    </div>
                ) : (
                    <div className="relative pl-5 pt-2 pb-2 space-y-5">
                        {/* Timeline Line */}
                        <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-slate-100 rounded-full"></div>
                        
                        {currentPeriodHistory.map((tx, idx) => {
                            const dateObj = new Date(tx.date);
                            // FULL DATE WITH DAY NAME (e.g., 14 Kasım Perşembe)
                            const fullDateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
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
                                    <div className={`absolute -left-[15px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${dotColor}`}></div>
                                    <div className="flex justify-between items-start pr-2">
                                        <div>
                                            <div className={`text-xs font-bold ${statusColor}`}>{statusText}</div>
                                            {/* FULL DATE DISPLAY */}
                                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">{fullDateStr} • {time}</div>
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
        {safeResources.length > 0 && (
            <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 mt-6">ÖDEVLER & MATERYALLER</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {safeResources.map(res => (
                        <a 
                            key={res.id} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all hover:shadow-md block"
                        >
                            {/* If IMAGE, show large preview */}
                            {res.type === 'IMAGE' ? (
                                <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                                    <img src={res.url} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                                        <div className="flex items-center gap-1.5 text-white/90 mb-1">
                                            <Image size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">GÖRSEL / NOTA</span>
                                        </div>
                                        <h4 className="text-white font-bold text-sm truncate">{res.title}</h4>
                                    </div>
                                </div>
                            ) : (
                                // If LINK/VIDEO, show icon card
                                <div className="p-4 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                                        res.type === 'VIDEO' ? 'bg-gradient-to-br from-red-500 to-rose-600' : 
                                        res.type === 'PDF' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 
                                        'bg-gradient-to-br from-slate-700 to-slate-800'
                                    }`}>
                                        {res.type === 'VIDEO' ? <Youtube size={20} /> : res.type === 'PDF' ? <FileText size={20} /> : <Link size={20} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{res.title}</h4>
                                        <div className="flex items-center gap-1 mt-1 text-slate-400">
                                            <ExternalLink size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{res.type}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            )}
                        </a>
                    ))}
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 opacity-40">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-slate-100">
                <Sparkles size={10} className="text-indigo-400" />
                <span>Powered by Kurs Pro</span>
            </div>
        </div>

      </div>
    </div>
  );
};
