
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { CheckCircle2, Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Calendar } from 'lucide-react';

interface ParentViewProps {
  teacherId: string;
  studentId: string;
}

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
      currentPeriodHistory
  } = useMemo(() => {
      if (!student || !appState) return { nextLesson: null, lastPaymentStr: "-", nextPaymentStr: "-", currentPeriodHistory: [] };

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
      const lastPaymentTx = allHistorySorted.find(tx => !tx.isDebt && !tx.note.includes("Telafi") && !tx.note.includes("Deneme"));
      
      let lastPaymentDateStr = "Henüz Yok";
      let nextPaymentDateStr = "-";

      // Calculate Dates
      if (lastPaymentTx) {
          const lastDate = new Date(lastPaymentTx.date);
          lastPaymentDateStr = lastDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
          
          // Next Payment = Last Payment + 1 Month
          const nextDate = new Date(lastDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextPaymentDateStr = nextDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      } else if (student.registrationDate) {
          // If no payment yet, base on registration
          const regDate = new Date(student.registrationDate);
          const nextDate = new Date(regDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextPaymentDateStr = nextDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      }

      // 4. Filter History (Show only after last payment)
      let filteredHistory = allHistorySorted;
      if (lastPaymentTx) {
          const paymentTime = new Date(lastPaymentTx.date).getTime();
          filteredHistory = allHistorySorted.filter(tx => new Date(tx.date).getTime() > paymentTime);
      }

      return {
          nextLesson: getNextLesson(),
          lastPaymentStr: lastPaymentDateStr,
          nextPaymentStr: nextPaymentDateStr,
          currentPeriodHistory: filteredHistory
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
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto shadow-2xl overflow-hidden relative font-sans text-slate-800">
      
      {/* Header - Compact */}
      <div className="bg-white px-5 pt-6 pb-4 rounded-b-[1.5rem] shadow-sm border-b border-slate-100 relative z-20">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-0.5">VELİ BİLGİLENDİRME</p>
                <h1 className="font-black text-slate-900 text-lg leading-tight">{appState.schoolName || "Kurs Sistemi"}</h1>
            </div>
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles size={16} />
            </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center text-sm font-bold shadow-md">
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h2 className="text-base font-black text-slate-900 leading-none">{student.name}</h2>
                <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-emerald-600">Aktif Öğrenci</span>
                </div>
            </div>
        </div>
      </div>

      {/* Content - Compact Layout */}
      <div className="p-4 space-y-3 relative z-10">
        
        {/* Gelecek Ders Kartı */}
        <div className="bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-lg shadow-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-3xl -ml-5 -mb-5"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <Clock size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">SIRADAKİ DERS</span>
                </div>
                {nextLesson ? (
                    <div>
                        <div className="text-2xl font-black tracking-tight">{nextLesson.day}</div>
                        <div className="text-sm font-medium text-indigo-200">{nextLesson.time}</div>
                    </div>
                ) : (
                    <div className="text-sm font-bold opacity-80 py-1">Planlanmış ders yok.</div>
                )}
            </div>
        </div>

        {/* Ödeme Bilgisi Kartı - Gelişmiş */}
        <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-3">
             <div className="flex items-center justify-between">
                 <div>
                     <p className="text-[9px] text-slate-400 font-bold mb-0.5">AYLIK ABONELİK</p>
                     <p className="text-xl font-black text-slate-900">{student.fee} <span className="text-xs font-bold text-slate-400">TL</span></p>
                 </div>
                 {/* Dönem Ders Sayısı Rozeti */}
                 {student.debtLessonCount > 0 && (
                    <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-bold">BU AY</p>
                        <p className="text-xs font-black text-slate-800">{student.debtLessonCount} Ders</p>
                    </div>
                 )}
             </div>

             {/* Ödeme Tarihleri Izgarası */}
             <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">SON ÖDEME</p>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-700">{lastPaymentStr}</span>
                    </div>
                </div>
                <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                    <p className="text-[8px] font-bold text-indigo-400 uppercase mb-1">GELECEK ÖDEME</p>
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-700">{nextPaymentStr}</span>
                    </div>
                </div>
             </div>
        </div>

        {/* Geçmiş Hareketler Listesi (Filtrelenmiş) */}
        <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2 mt-2">DÖNEM HAREKETLERİ</h3>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                {currentPeriodHistory.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                            <Sparkles size={18} />
                        </div>
                        <p className="text-slate-900 font-bold text-xs">Yeni Dönem Başladı</p>
                        <p className="text-slate-400 text-[10px] mt-1">Son ödemeden sonra henüz işlenmiş ders yok.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {currentPeriodHistory.map(tx => {
                            const dateObj = new Date(tx.date);
                            const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                            const time = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            
                            let statusText = "Katıldı";
                            let statusColor = "text-indigo-600";
                            let icon = <CheckCircle2 size={14} className="text-indigo-500" />;

                            if (tx.note.includes("Telafi")) {
                                statusText = "Telafi Dersi";
                                statusColor = "text-orange-500";
                                icon = <Layers size={14} className="text-orange-500" />;
                            } else if (tx.note.includes("Deneme")) {
                                statusText = "Deneme Dersi";
                                statusColor = "text-purple-500";
                                icon = <Sparkles size={14} className="text-purple-500" />;
                            } else if (tx.note.includes("Gelmedi") || tx.note.includes("Habersiz")) {
                                statusText = "Gelmedi";
                                statusColor = "text-red-500";
                                icon = <XCircle size={14} className="text-red-500" />;
                            } else if (!tx.isDebt) {
                                // Ara ödemeler vs.
                                statusText = "Ödeme Alındı";
                                statusColor = "text-emerald-600";
                                icon = <Banknote size={14} className="text-emerald-500" />;
                            }

                            return (
                                <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 text-center leading-tight">
                                            <div className="text-[10px] font-bold text-slate-900 uppercase">{day.split(' ')[1]}</div>
                                            <div className="text-base font-black text-slate-800">{day.split(' ')[0]}</div>
                                        </div>
                                        <div className="h-6 w-px bg-slate-100"></div>
                                        <div>
                                            <div className={`text-xs font-bold ${statusColor}`}>{statusText}</div>
                                            <div className="text-[9px] text-slate-400 font-medium">{time}</div>
                                        </div>
                                    </div>
                                    <div className="opacity-80">
                                        {icon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        <div className="text-center pt-4 pb-8">
            <div className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                <Sparkles size={8} />
                <span>Powered by Kurs Pro</span>
            </div>
        </div>

      </div>
    </div>
  );
};
