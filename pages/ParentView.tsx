
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, Student } from '../types';
import { CheckCircle2, Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Calendar, Palette, Music, BookOpen, Trophy, Activity, Link, Youtube, FileText, Image } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto shadow-2xl overflow-hidden relative font-sans text-slate-800">
      
      {/* Header - LOGO CENTERED & NO TEXT */}
      <div className="bg-white px-5 pt-10 pb-6 rounded-b-[2rem] shadow-sm border-b border-slate-100 relative z-20">
        
        {/* LOGO AREA */}
        <div className="flex justify-center mb-6">
            <div className="h-32 w-auto max-w-[240px] flex items-center justify-center relative">
                {isCustomLogo ? (
                    <img src={appState.schoolIcon} alt="Logo" className="h-full w-full object-contain drop-shadow-sm" />
                ) : (
                    <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <SchoolIcon size={48} strokeWidth={1.5} />
                    </div>
                )}
            </div>
        </div>

        {/* Student Mini Profile */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-slate-200">
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h2 className="text-lg font-black text-slate-900 leading-none tracking-tight">{student.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[11px] font-bold text-emerald-600">Aktif Öğrenci</span>
                </div>
            </div>
        </div>
      </div>

      {/* Content - Compact Layout */}
      <div className="p-5 space-y-4 relative z-10 pb-32">
        
        {/* Gelecek Ders Kartı (Kompakt) */}
        <div className="bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-lg shadow-slate-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl -mr-8 -mt-8"></div>
            
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
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
        </div>

        {/* Ödeme Tarihleri (NO FEE DISPLAYED) */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">SON ÖDEME</p>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-slate-700">{lastPaymentStr}</span>
                </div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center gap-1">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide">GELECEK ÖDEME</p>
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-700">{nextPaymentStr}</span>
                </div>
            </div>
            
            {/* Dönem Ders Sayısı Rozeti - Full Width */}
            {student.debtLessonCount > 0 && (
                <div className="col-span-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">Bu Dönem İşlenen</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{student.debtLessonCount} Ders</span>
                </div>
            )}
        </div>

        {/* Geçmiş Hareketler Listesi (Filtrelenmiş & Kompakt) */}
        <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 mt-4">DÖNEM HAREKETLERİ</h3>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
                {currentPeriodHistory.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                            <Sparkles size={18} />
                        </div>
                        <p className="text-slate-900 font-bold text-xs">Yeni Dönem</p>
                        <p className="text-slate-400 text-[10px] mt-1">Son ödemeden sonra işlem yok.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {currentPeriodHistory.map(tx => {
                            const dateObj = new Date(tx.date);
                            const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                            const time = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            
                            let statusText = "Katıldı";
                            let statusColor = "text-indigo-600";
                            let icon = <CheckCircle2 size={16} className="text-indigo-500" />;

                            if (tx.note.includes("Telafi")) {
                                statusText = "Telafi";
                                statusColor = "text-orange-500";
                                icon = <Layers size={16} className="text-orange-500" />;
                            } else if (tx.note.includes("Deneme")) {
                                statusText = "Deneme";
                                statusColor = "text-purple-500";
                                icon = <Sparkles size={16} className="text-purple-500" />;
                            } else if (tx.note.includes("Gelmedi") || tx.note.includes("Habersiz")) {
                                statusText = "Gelmedi";
                                statusColor = "text-red-500";
                                icon = <XCircle size={16} className="text-red-500" />;
                            } else if (!tx.isDebt) {
                                statusText = "Ödeme";
                                statusColor = "text-emerald-600";
                                icon = <Banknote size={16} className="text-emerald-500" />;
                            }

                            return (
                                <div key={tx.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 text-center leading-tight shrink-0">
                                            <div className="text-[9px] font-bold text-slate-900 uppercase">{day.split(' ')[1]}</div>
                                            <div className="text-lg font-black text-slate-800">{day.split(' ')[0]}</div>
                                        </div>
                                        <div className="h-8 w-px bg-slate-100"></div>
                                        <div>
                                            <div className={`text-xs font-bold ${statusColor}`}>{statusText}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{time}</div>
                                        </div>
                                    </div>
                                    <div className="opacity-80 bg-slate-50 p-2 rounded-lg">
                                        {icon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Resources / Homework Section */}
        {(student.resources || []).length > 0 && (
            <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 mt-6">ÖDEVLER & MATERYALLER</h3>
                <div className="space-y-3">
                    {student.resources.map(res => (
                        <a 
                            key={res.id} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform hover:border-indigo-100"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${
                                res.type === 'VIDEO' ? 'bg-red-500 shadow-red-200' : 
                                res.type === 'PDF' ? 'bg-blue-500 shadow-blue-200' : 
                                res.type === 'IMAGE' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-700 shadow-slate-300'
                            }`}>
                                {res.type === 'VIDEO' ? <Youtube size={24} /> : 
                                 res.type === 'PDF' ? <FileText size={24} /> : 
                                 res.type === 'IMAGE' ? <Image size={24} /> : <Link size={24} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{res.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{res.type === 'LINK' ? 'BAĞLANTI' : res.type}</span>
                                    <span className="text-[9px] text-slate-300">• Dokun ve Aç</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        )}

        <div className="text-center pt-8 pb-4 opacity-50">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                <Sparkles size={10} className="text-indigo-400" />
                <span>Powered by Kurs Pro</span>
            </div>
        </div>

      </div>
    </div>
  );
};
