
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Palette, Music, BookOpen, Trophy, Activity, Link, Youtube, FileText, Image, ChevronRight, ExternalLink } from 'lucide-react';

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
      safeResources
  } = useMemo(() => {
      if (!student || !appState) return { 
          nextLesson: null, lastPaymentStr: "-", nextPaymentStr: "-", currentPeriodHistory: [], safeResources: []
      };

      // Resources Safety Check
      const safeResources = Array.isArray(student.resources) ? student.resources : [];

      // 1. Next Lesson Logic
      const getNextLesson = () => {
        const today = new Date();
        const dayIndex = today.getDay(); // 0=Pazar
        const daysMap = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        const appKeys = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt"];
        
        for (let i = 0; i < 7; i++) {
            const checkDayIndex = (dayIndex + i) % 7;
            const keyDayName = appKeys[checkDayIndex];
            const displayDayName = daysMap[checkDayIndex];
            
            const key = `${appState.currentTeacher}|${keyDayName}`;
            const slots = appState.schedule[key] || [];
            const foundSlot = slots.find(s => s.studentId === student.id);
            if (foundSlot) {
                const isToday = i === 0;
                if (!isToday || (isToday)) {
                    return { day: isToday ? "Bugün" : displayDayName, time: `${foundSlot.start} - ${foundSlot.end}` };
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
      let nextPaymentDateStr = "-";
      let lastPaymentDateObj: Date | null = null;

      if (lastPaymentTx) {
          lastPaymentDateObj = new Date(lastPaymentTx.date);
          lastPaymentDateStr = lastPaymentDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      } else if (student.registrationDate) {
          lastPaymentDateObj = new Date(student.registrationDate);
          lastPaymentDateStr = "Kayıt Tarihi";
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-indigo-100 pb-24 pt-6">
      
      {/* --- STUDENT HEADER --- */}
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
        
        {/* --- GRID: DERS & ÖDEME --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* NEXT LESSON CARD */}
            <div className="relative overflow-hidden rounded-[2rem] bg-indigo-600 p-6 text-white shadow-xl shadow-indigo-200 flex flex-col justify-between min-h-[160px] group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[40px] -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-[30px] -ml-5 -mb-5"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 opacity-70">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">SIRADAKİ DERS</span>
                    </div>
                    
                    {nextLesson ? (
                        <div>
                            <div className="text-3xl font-black tracking-tighter mb-1">{nextLesson.day}</div>
                            <div className="text-lg font-medium text-indigo-100">{nextLesson.time}</div>
                        </div>
                    ) : (
                        <div>
                            <div className="text-xl font-bold opacity-90">Ders Planı Yok</div>
                            <p className="text-xs text-indigo-200 mt-1">Planlama için eğitmenle görüşünüz.</p>
                        </div>
                    )}
                </div>
                {nextLesson && (
                    <div className="relative z-10 mt-auto pt-4 flex justify-end">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                            <ChevronRight size={20} />
                        </div>
                    </div>
                )}
            </div>

            {/* PAYMENT STATUS CARD */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                 <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Banknote size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DURUM</span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">Son Ödeme</span>
                            <span className="text-sm font-bold text-slate-800">{lastPaymentStr}</span>
                        </div>
                        <div className="w-full h-px bg-slate-50"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">Gelecek Ödeme</span>
                            <span className="text-sm font-bold text-indigo-600">{nextPaymentStr}</span>
                        </div>
                    </div>
                 </div>

                 {student.debtLessonCount > 0 && (
                    <div className="mt-4 bg-orange-50 rounded-xl p-3 flex items-center gap-3 border border-orange-100">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <AlertCircle size={16} />
                        </div>
                        <div className="leading-tight">
                            <div className="text-[10px] font-bold text-orange-400 uppercase">ÖDEME BEKLEYEN</div>
                            <div className="text-xs font-bold text-orange-800">{student.debtLessonCount} Ders İşlendi</div>
                        </div>
                    </div>
                 )}
            </div>
        </div>

        {/* --- TIMELINE HISTORY --- */}
        <div>
            <div className="flex items-center justify-between mb-4 px-2 mt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} />
                    DÖNEM HAREKETLERİ
                </h3>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-1">
                {currentPeriodHistory.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <Layers size={24} />
                        </div>
                        <p className="text-slate-900 font-bold text-sm">Yeni Dönem</p>
                        <p className="text-slate-400 text-xs mt-1">Son ödemeden sonra henüz ders işlenmedi.</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {currentPeriodHistory.map((tx, idx) => {
                            const dateObj = new Date(tx.date);
                            const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric' });
                            const month = dateObj.toLocaleDateString('tr-TR', { month: 'short' });
                            const weekday = dateObj.toLocaleDateString('tr-TR', { weekday: 'long' });
                            
                            let statusText = "Ders İşlendi";
                            let statusColor = "text-slate-700";
                            
                            if (tx.note.includes("Telafi")) {
                                statusText = "Telafi Dersi"; statusColor = "text-orange-700";
                            } else if (tx.note.includes("Deneme")) {
                                statusText = "Deneme Dersi"; statusColor = "text-purple-700";
                            } else if (tx.note.includes("Gelmedi")) {
                                statusText = "Derse Gelmedi"; statusColor = "text-red-700";
                            } else if (!tx.isDebt) {
                                statusText = "Ödeme Alındı"; statusColor = "text-emerald-700";
                            }

                            return (
                                <div key={tx.id} className="group flex items-center p-4 hover:bg-slate-50 transition-colors rounded-[1.5rem] relative">
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 font-bold shrink-0 mr-4 border border-slate-200">
                                        <span className="text-lg leading-none">{day}</span>
                                        <span className="text-[9px] uppercase">{month}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-bold ${statusColor}`}>{statusText}</h4>
                                        <p className="text-xs text-slate-400 font-medium truncate">{weekday} • {tx.note.replace(statusText, '').replace(/[()]/g, '').trim() || 'Normal Program'}</p>
                                    </div>
                                    
                                    {/* Status Dot */}
                                    <div className={`w-2 h-2 rounded-full ${tx.isDebt ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
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
                            href={res.url} 
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
