
import React, { useEffect, useState } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { CheckCircle2, Clock, Layers, ShieldCheck, Sparkles, XCircle, Calendar, Banknote, AlertCircle } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium text-sm">Sistem Yükleniyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
          <XCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Erişim Hatası</h3>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
      </div>
    );
  }

  const { student, appState } = data;

  // --- Helpers ---
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

  const getLastPaymentDate = () => {
      const paymentTx = student.history.find(tx => !tx.isDebt);
      if (paymentTx) {
          return new Date(paymentTx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      }
      return "Yok";
  };

  const nextLesson = getNextLesson();
  const lastPayment = getLastPaymentDate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto shadow-2xl overflow-hidden relative font-sans">
      
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-6 rounded-b-[2rem] shadow-sm border-b border-slate-100 relative z-20">
        <div className="flex justify-between items-start mb-6">
            <div>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">VELİ BİLGİLENDİRME</p>
                <h1 className="font-black text-slate-900 text-xl leading-tight">{appState.schoolName || "Kurs Sistemi"}</h1>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
            </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold shadow-md">
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h2 className="text-lg font-black text-slate-900 leading-none">{student.name}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-emerald-600">Aktif Öğrenci</span>
                </div>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5 relative z-10">
        
        {/* Gelecek Ders */}
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl shadow-slate-300 relative overflow-hidden">
            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-3xl -ml-5 -mb-5"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-slate-400 mb-3">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">SIRADAKİ DERS</span>
                </div>
                {nextLesson ? (
                    <div>
                        <div className="text-3xl font-black tracking-tight">{nextLesson.day}</div>
                        <div className="text-lg font-medium text-indigo-200 mt-1">{nextLesson.time}</div>
                    </div>
                ) : (
                    <div className="text-lg font-bold opacity-80 py-2">Planlanmış ders yok.</div>
                )}
            </div>
        </div>

        {/* Ödeme Bilgisi (YENİ) */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-1">
                 <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Banknote size={16} />
                 </div>
                 <span className="text-xs font-black text-slate-400 uppercase tracking-wider">ÖDEME BİLGİSİ</span>
             </div>
             
             <div className="flex items-center justify-between">
                 <div>
                     <p className="text-[10px] text-slate-400 font-bold mb-0.5">AYLIK ABONELİK</p>
                     <p className="text-2xl font-black text-slate-900">{student.fee} <span className="text-sm font-bold text-slate-400">TL</span></p>
                 </div>
                 <div className="text-right">
                     <p className="text-[10px] text-slate-400 font-bold mb-0.5">SON ÖDEME</p>
                     <p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{lastPayment}</p>
                 </div>
             </div>
             
             {student.debtLessonCount > 0 && (
                 <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 border border-slate-100">
                     <AlertCircle size={16} className="text-slate-400" />
                     <p className="text-xs text-slate-500 font-medium">Bu dönem <strong className="text-slate-900">{student.debtLessonCount} ders</strong> işlendi.</p>
                 </div>
             )}
        </div>

        {/* Geçmiş / Yoklama Listesi */}
        <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">SON AKTİVİTELER</h3>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {student.history.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-8">Henüz kayıt yok.</p>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {student.history.slice(0, 5).map(tx => {
                            const dateObj = new Date(tx.date);
                            const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                            const time = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            
                            // Durum Analizi
                            let statusText = "Katıldı";
                            let statusColor = "text-indigo-600";
                            let icon = <CheckCircle2 size={16} className="text-indigo-500" />;

                            if (!tx.isDebt) {
                                statusText = "Ödeme Yapıldı";
                                statusColor = "text-emerald-600";
                                icon = <Banknote size={16} className="text-emerald-500" />;
                            } else if (tx.note.includes("Gelmedi")) {
                                statusText = "Gelmedi";
                                statusColor = "text-red-500";
                                icon = <XCircle size={16} className="text-red-500" />;
                            } else if (tx.note.includes("Telafi")) {
                                statusText = "Telafi";
                                statusColor = "text-orange-500";
                                icon = <Layers size={16} className="text-orange-500" />;
                            }

                            return (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 text-center leading-tight">
                                            <div className="text-xs font-bold text-slate-900 uppercase">{day.split(' ')[1]}</div>
                                            <div className="text-lg font-black text-slate-800">{day.split(' ')[0]}</div>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100"></div>
                                        <div>
                                            <div className={`text-sm font-bold ${statusColor}`}>{statusText}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{time}</div>
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

        <div className="text-center pt-6 pb-10">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                <Sparkles size={10} />
                <span>Powered by Kurs Pro</span>
            </div>
        </div>

      </div>
    </div>
  );
};
