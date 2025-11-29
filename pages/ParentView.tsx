
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Palette, Music, BookOpen, Trophy, Activity, Link, Youtube, FileText, Image, ChevronRight, ExternalLink, CheckCircle2, Ban, Calendar } from 'lucide-react';

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
      currentPeriodHistory,
      safeResources
  } = useMemo(() => {
      if (!student || !appState) return { 
          nextLesson: null, lastPaymentStr: "-", currentPeriodHistory: [], safeResources: []
      };

      // Resources Safety Check
      const safeResources = Array.isArray(student.resources) ? student.resources : [];

      // 1. Next Lesson Logic
      const getNextLesson = () => {
        const today = new Date();
        const dayIndex = today.getDay(); // 0=Pazar
        // App keys used in state.schedule
        const appKeys = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt"];
        
        for (let i = 0; i < 7; i++) {
            const checkDayIndex = (dayIndex + i) % 7;
            const keyDayName = appKeys[checkDayIndex];
            
            const key = `${appState.currentTeacher}|${keyDayName}`;
            const slots = appState.schedule[key] || [];
            const foundSlot = slots.find(s => s.studentId === student.id);
            
            if (foundSlot) {
                const isToday = i === 0;
                // Calculate actual date
                const targetDate = new Date();
                targetDate.setDate(today.getDate() + i);
                
                const formattedDate = targetDate.toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'long', 
                    weekday: 'long' 
                });

                // Special format for today: "Bugün, 12 Ekim"
                // Normal format: "14 Ekim Pazartesi"
                const displayDate = isToday 
                    ? `Bugün, ${targetDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` 
                    : formattedDate;

                if (!isToday || (isToday)) {
                    return { day: displayDate, time: `${foundSlot.start} - ${foundSlot.end}` };
                }
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
      
      let lastPaymentDateStr = "Kayıt Yok";
      let lastPaymentDateObj: Date | null = null;

      if (lastPaymentTx) {
          lastPaymentDateObj = new Date(lastPaymentTx.date);
          lastPaymentDateStr = lastPaymentDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      } else if (student.registrationDate) {
          lastPaymentDateObj = new Date(student.registrationDate);
          lastPaymentDateStr = "Kayıt Tarihi";
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
          currentPeriodHistory: filteredHistory,
          safeResources
      };

  }, [student, appState]);


  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-sm tracking-wide">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !student || !appState) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <XCircle size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800">Erişim Hatası</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium">{error}</p>
      </div>
    );
  }

  // Helper for safe links
  const getSafeUrl = (url: string) => {
      if (!url) return '#';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `https://${url}`;
  };

  const renderNextLessonDate = () => {
      if (!nextLesson) return null;
      if (nextLesson.day.includes(',')) {
          const parts = nextLesson.day.split(',');
          return (
              <>
                  <div className="text-xs font-medium text-indigo-100 opacity-90 leading-tight">{parts[0]}</div>
                  <div className="text-base font-black tracking-tight leading-none mt-0.5">{parts[1]}</div>
              </>
          );
      } else {
          // Format: "14 Ekim Pazartesi"
          const parts = nextLesson.day.split(' ');
          const dayName = parts[parts.length - 1]; 
          const datePart = parts.slice(0, parts.length - 1).join(' ');
          return (
              <>
                  <div className="text-xs font-medium text-indigo-100 opacity-90 leading-tight">{dayName}</div>
                  <div className="text-base font-black tracking-tight leading-none mt-0.5">{datePart}</div>
              </>
          );
      }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-indigo-100 pb-24 pt-6">
      
      {/* --- STUDENT HEADER (SIMPLIFIED) --- */}
      <div className="px-5 mb-6 animate-slide-up">
            <div className="bg-white rounded-[2rem] p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4 relative overflow-hidden">
                 {/* Background Decor */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                 <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shrink-0 shadow-lg shadow-slate-200 z-10">
                    {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="z-10">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ÖĞRENCİ PORTALI</p>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{student.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-xs font-bold text-emerald-600">Aktif Öğrenci</span>
                    </div>
                </div>
            </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 space-y-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        
        {/* --- GRID: DERS & ÖDEME (KOMPAKT & YAN YANA) --- */}
        <div className="grid grid-cols-2 gap-3">
            
            {/* NEXT LESSON CARD */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-indigo-600 p-4 text-white shadow-lg shadow-indigo-200 flex flex-col justify-between h-40 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-[30px] -mr-8 -mt-8 pointer-events-none"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-1.5 mb-2 opacity-80">
                            <Clock size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">SIRADAKİ</span>
                        </div>
                        
                        {nextLesson ? (
                            <div>
                                {renderNextLessonDate()}
                            </div>
                        ) : (
                            <div>
                                <div className="text-base font-bold opacity-90 leading-tight">Plan Yok</div>
                                <p className="text-[10px] text-indigo-200 mt-0.5 leading-tight">Eğitmenle görüşün.</p>
                            </div>
                        )}
                    </div>

                    {nextLesson && (
                        <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg self-start mt-2">
                             <span className="text-sm font-bold">{nextLesson.time.split('-')[0]}</span>
                             <span className="text-[10px] opacity-70">{nextLesson.time.split('-')[1]}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* PAYMENT STATUS CARD */}
            <div className="bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-40 relative overflow-hidden">
                 <div>
                    <div className="flex items-center gap-1.5 mb-3">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Banknote size={14} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DURUM</span>
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Son Ödeme</span>
                        <span className="text-sm font-black text-slate-800 leading-tight truncate block" title={lastPaymentStr}>{lastPaymentStr}</span>
                    </div>
                 </div>

                 {student.debtLessonCount > 0 ? (
                    <div className="mt-2 pt-2 border-t border-slate-50">
                        <div className="text-[9px] font-bold text-orange-400 uppercase mb-0.5">ÖDEME BEKLEYEN</div>
                        <div className="flex items-center gap-1.5 text-orange-600 font-bold bg-orange-50 p-2 rounded-xl border border-orange-100">
                            <AlertCircle size={14} />
                            <span className="text-xs leading-none">{student.debtLessonCount} Ders</span>
                        </div>
                    </div>
                 ) : (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                         <CheckCircle2 size={16} />
                         <span className="text-xs font-bold leading-none">Borç Yok</span>
                    </div>
                 )}
            </div>
        </div>

        {/* --- TIMELINE HISTORY (COMPACT) --- */}
        <div>
            <div className="flex items-center justify-between mb-4 px-2 mt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} />
                    GEÇMİŞ HAREKETLER
                </h3>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {currentPeriodHistory.length === 0 ? (
                    <div className="text-center py-10 px-6">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <Calendar size={20} />
                        </div>
                        <p className="text-slate-900 font-bold text-sm">Hareket Yok</p>
                        <p className="text-slate-400 text-xs mt-1">Bu dönem henüz ders kaydı girilmedi.</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-slate-50">
                        {currentPeriodHistory.map((tx, idx) => {
                            const dateObj = new Date(tx.date);
                            const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                            
                            let StatusIcon = CheckCircle2;
                            let iconBg = "bg-indigo-50 text-indigo-600";
                            let statusText = "Ders";
                            
                            if (tx.note.includes("Telafi")) {
                                StatusIcon = Layers;
                                iconBg = "bg-orange-50 text-orange-600";
                                statusText = "Telafi";
                            } else if (tx.note.includes("Deneme")) {
                                StatusIcon = Sparkles;
                                iconBg = "bg-purple-50 text-purple-600";
                                statusText = "Deneme";
                            } else if (tx.note.includes("Gelmedi")) {
                                StatusIcon = Ban;
                                iconBg = "bg-red-50 text-red-600";
                                statusText = "Gelmedi";
                            } else if (!tx.isDebt) {
                                StatusIcon = Banknote;
                                iconBg = "bg-emerald-50 text-emerald-600";
                                statusText = "Ödeme";
                            }

                            return (
                                <div key={tx.id} className="flex items-center justify-between py-4 px-5 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                                            <StatusIcon size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                                {tx.note.replace(statusText, '').replace(/[()]/g, '').trim() || statusText}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                {statusText} İşlemi
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 text-right whitespace-nowrap">
                                        {day}
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
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2 mt-8 flex items-center gap-2">
                    <BookOpen size={14} />
                    ÖDEVLER & MATERYALLER
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {safeResources.map(res => (
                        <a 
                            key={res.id} 
                            href={getSafeUrl(res.url)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group flex items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]"
                        >
                            {/* Icon / Thumbnail */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 mr-4 overflow-hidden shadow-sm ${
                                res.type === 'VIDEO' ? 'bg-red-50 text-red-500' : 
                                res.type === 'PDF' ? 'bg-blue-50 text-blue-500' : 
                                res.type === 'IMAGE' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {res.type === 'IMAGE' ? (
                                    <img src={res.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    res.type === 'VIDEO' ? <Youtube size={24} /> : 
                                    res.type === 'PDF' ? <FileText size={24} /> : <Link size={24} />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors truncate">{res.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md uppercase tracking-wide">{res.type}</span>
                                    <span className="text-[10px] text-slate-300 font-medium truncate max-w-[150px]">Görüntüle</span>
                                </div>
                            </div>
                            
                            <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <ExternalLink size={14} />
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="text-center pt-10 pb-6 opacity-40">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {appState.schoolName}
            </p>
        </div>

      </div>
    </div>
  );
};
