
import React, { useEffect, useState, useMemo } from 'react';
import { DataService, FileService } from '../services/api';
import { AppState, Student, LessonSlot } from '../types';
import { Clock, Layers, Sparkles, XCircle, Banknote, AlertCircle, Palette, Music, BookOpen, Trophy, Activity, Link, Youtube, FileText, Image, ChevronRight, ExternalLink, CheckCircle2, Ban, Calendar, CalendarCheck, ArrowRight, UserCheck, Loader2, Eye, Download, TrendingUp } from 'lucide-react';
import { Dialog } from '../components/Dialog';

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

  // Preview Modal States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'IMAGE' | 'PDF' | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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
      safeResources,
      lessonNumberMap,
      totalDoneCount
  } = useMemo(() => {
      if (!student || !appState) return { 
          nextLesson: null, lastPaymentStr: "Ödeme Kaydı Yok", currentPeriodHistory: [], safeResources: [], lessonNumberMap: new Map(), totalDoneCount: 0
      };

      // Resources Safety Check
      const safeResources = Array.isArray(student.resources) ? student.resources : [];

      // 1. Next Lesson Logic (Search ALL teachers)
      const getNextLesson = () => {
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize today
        
        const dayIndex = today.getDay(); // 0=Pazar
        // App keys used in state.schedule
        const appKeys = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt"];
        
        let foundSlot: { slot: any, date: Date } | null = null;
        
        // Check next 7 days starting from today
        for (let i = 0; i < 7; i++) {
            const checkDayIndex = (dayIndex + i) % 7;
            const keyDayName = appKeys[checkDayIndex];
            
            // Search in ALL schedule keys that end with this day name
            let dailySlot: LessonSlot | undefined = undefined;
            
            // appState.schedule keys are like "TeacherName|DayName"
            Object.entries(appState.schedule).forEach(([key, slots]) => {
                if (key.endsWith(`|${keyDayName}`)) {
                    const s = (slots as LessonSlot[]).find(slot => slot.studentId === student.id);
                    if (s) {
                        dailySlot = s;
                    }
                }
            });

            if (dailySlot) {
                // Found a slot
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + i);
                
                foundSlot = { slot: dailySlot, date: targetDate };
                break; // Stop at the first found lesson
            }
        }

        if (!foundSlot) return null;

        let targetDate = foundSlot.date;

        // Enforce Registration Date as the start date
        if (student.registrationDate) {
            const regDate = new Date(student.registrationDate);
            regDate.setHours(0,0,0,0);
            
            // If the calculated next occurrence is before the registration date,
            // push it forward by weeks until it falls on or after the registration date.
            // Safety: Limit loop to avoid infinite loops if something is wrong (max 52 weeks)
            let weeksAdded = 0;
            while (targetDate < regDate && weeksAdded < 52) {
                targetDate.setDate(targetDate.getDate() + 7);
                weeksAdded++;
            }
        }

        // Formatting
        const isToday = targetDate.getTime() === today.getTime();
        const formattedDate = targetDate.toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            weekday: 'long' 
        });

        const displayDate = isToday 
            ? `Bugün, ${targetDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}` 
            : formattedDate;

        return { day: displayDate, time: `${foundSlot.slot.start} - ${foundSlot.slot.end}` };
      };

      // 2. History Processing
      const safeHistory = student.history || [];
      const allHistorySorted = [...safeHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 3. Payment Logic
      const lastPaymentTx = allHistorySorted.find(tx => 
          !tx.isDebt && 
          !(tx.note || "").includes("Telafi") && 
          !(tx.note || "").includes("Deneme") && 
          !(tx.note || "").includes("Ders")
      );
      
      let lastPaymentDateStr = "Ödeme Kaydı Yok";
      let lastPaymentDateObj: Date | null = null;

      if (lastPaymentTx) {
          lastPaymentDateObj = new Date(lastPaymentTx.date);
          lastPaymentDateStr = lastPaymentDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      }

      // 4. Filter History (Show only AFTER last payment + INCLUDE THE PAYMENT)
      let filteredHistory = allHistorySorted;
      if (lastPaymentTx) {
          const paymentIndex = allHistorySorted.findIndex(tx => tx.id === lastPaymentTx.id);
          if (paymentIndex !== -1) {
              // Slice includes the payment index
              filteredHistory = allHistorySorted.slice(0, paymentIndex + 1);
          }
      }

      // 5. Dynamic Lesson Numbering Logic & Total Count
      const lessonNumberMap = new Map<string, number>();
      
      // Hangi dersler sayaca dahil edilecek?
      // - Normal dersler
      // - Yapılan telafiler (bekleyenler değil)
      // - Deneme dersleri
      const countableLessons = filteredHistory.filter(tx => {
          if (!tx.isDebt) return false;
          const lowerNote = (tx.note || "").toLowerCase();
          return !lowerNote.includes("gelmedi") && 
                 !lowerNote.includes("katılım yok") &&
                 !lowerNote.includes("iptal") &&
                 !lowerNote.includes("telafi bekliyor");
      });
      
      // Numaralandırma için eskiden yeniye sırala
      countableLessons.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      countableLessons.forEach((tx, index) => {
          lessonNumberMap.set(tx.id, index + 1);
      });
      
      return {
          nextLesson: getNextLesson(),
          lastPaymentStr: lastPaymentDateStr,
          currentPeriodHistory: filteredHistory, 
          safeResources,
          lessonNumberMap,
          totalDoneCount: countableLessons.length
      };

  }, [student, appState]);


  // RESOURCE HANDLING
  const handleOpenResource = async (res: any) => {
      if (res.type === 'LINK' || res.type === 'VIDEO') {
          // Normal link ise yeni sekmede aç
          let url = res.url;
          if (!url.startsWith('http') && !url.startsWith('data:')) {
              url = 'https://' + url;
          }
          window.open(url, '_blank');
      } else {
          // PDF veya RESİM ise Modal içinde aç (Blocking önlemek için)
          setIsPreviewLoading(true);
          setIsPreviewOpen(true);
          setPreviewType(res.type);
          setPreviewTitle(res.title);
          setPreviewContent(null);

          let content = res.url;
          
          // Eğer içerik bir ID ise (FileService'den çek)
          if (!content.startsWith('data:') && !content.startsWith('http')) {
               // Use teacherId for fetching files scoped to the teacher
               const fetched = await FileService.getFile(teacherId, content);
               if (fetched) {
                   content = fetched;
               } else {
                   setPreviewContent(null);
                   setIsPreviewLoading(false);
                   alert("Dosyaya ulaşılamadı.");
                   return;
               }
          }

          setPreviewContent(content);
          setIsPreviewLoading(false);
      }
  };

  const handleDownload = () => {
      if (!previewContent) return;

      // Base64 to Blob conversion for clean download
      if (previewContent.startsWith('data:')) {
          try {
              const byteString = atob(previewContent.split(',')[1]);
              const mimeString = previewContent.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
              }
              const blob = new Blob([ab], {type: mimeString});
              const url = URL.createObjectURL(blob);
              
              const extension = previewType === 'PDF' ? 'pdf' : 'jpg';
              const filename = `${previewTitle || 'Dosya'}.${extension}`;
              
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
          } catch (e) {
              console.error("Download error:", e);
              // Fallback
              const a = document.createElement('a');
              a.href = previewContent;
              a.download = `${previewTitle || 'Dosya'}`;
              a.click();
          }
      } else {
          // Direct URL
          window.open(previewContent, '_blank');
      }
  };


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
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium">{error || "Bilgilere ulaşılamadı."}</p>
      </div>
    );
  }

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
      
      {/* --- STUDENT HEADER --- */}
      <div className="px-5 mb-6 animate-slide-up">
            <div className="bg-white rounded-[2rem] p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4 relative overflow-hidden">
                 {/* Background Decor */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="z-10 flex-1 min-w-0">
                    <h2 className="text-xl font-black text-slate-900 leading-tight truncate">{student.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-xs font-bold text-emerald-600">Öğrenci Portalı</span>
                    </div>
                </div>
            </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 space-y-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        
        {/* --- GRID: DERS & ÖDEME --- */}
        <div className="grid grid-cols-2 gap-3">
            
            {/* NEXT LESSON CARD */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-indigo-600 p-4 text-white shadow-lg shadow-indigo-200 flex flex-col justify-between h-40 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-[30px] -mr-8 -mt-8 pointer-events-none"></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-1.5 mb-3 opacity-80 h-4">
                            <Clock size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-widest leading-none">GELECEK DERS</span>
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

            {/* STATS CARD (Total Done) */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-white border border-slate-100 p-4 shadow-sm flex flex-col justify-between h-40">
                <div>
                   <div className="flex items-center gap-1.5 mb-3 text-slate-400">
                      <TrendingUp size={14} />
                      <span className="text-[9px] font-bold uppercase tracking-widest leading-none">DERS DURUMU</span>
                   </div>
                   <div className="flex items-end gap-1.5">
                      <span className="text-5xl font-black text-slate-800 tracking-tighter leading-none">{totalDoneCount}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Ders</span>
                   </div>
                   <p className="text-[9px] text-slate-400 font-medium mt-1">Bu dönem tamamlanan</p>
                </div>
             </div>
        </div>

        {/* --- TIMELINE HISTORY (COMPACT & CLEAN) --- */}
        <div>
            <div className="flex items-center justify-between mb-3 px-2 mt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} />
                    GEÇMİŞ HAREKETLER
                </h3>
            </div>
            
            <div className="relative space-y-4 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 before:-z-10">
                {currentPeriodHistory.length === 0 ? (
                    <div className="bg-white rounded-[1.5rem] border border-slate-100 border-dashed p-6 text-center shadow-sm">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                            <Calendar size={18} />
                        </div>
                        <p className="text-slate-900 font-bold text-xs">Hareket Yok</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Bu dönem henüz işlem yapılmadı.</p>
                    </div>
                ) : (
                    currentPeriodHistory.map((tx) => {
                        const dateObj = new Date(tx.date);
                        const dayNumber = dateObj.toLocaleDateString('tr-TR', { day: 'numeric' });
                        const monthName = dateObj.toLocaleDateString('tr-TR', { month: 'short' });
                        
                        let title = "";
                        let subtitle = "";
                        let iconColor = "text-indigo-600 bg-indigo-50";
                        let Icon = UserCheck;
                        let showAmount = false;

                        const lowerNote = (tx.note || "").toLowerCase();

                        if (!tx.isDebt) {
                            // PAYMENT
                            title = "Ödeme Alındı";
                            subtitle = "Teşekkürler";
                            iconColor = "text-emerald-600 bg-emerald-50";
                            Icon = Banknote;
                            showAmount = true;
                        } else if (lowerNote.includes("telafi")) {
                            // MAKEUP
                            iconColor = "text-orange-600 bg-orange-50";
                            Icon = Layers;
                            
                            if (lowerNote.includes("bekliyor")) {
                                title = "Telafi Hakkı";
                                subtitle = "Planlanacaktır";
                            } else {
                                // Telafi Tamamlandı: "Asıl:" ayrıştırması
                                if (tx.note.includes("(Asıl:")) {
                                    const parts = tx.note.split("(Asıl:");
                                    title = parts[0].trim();
                                    subtitle = "Asıl Ders:" + parts[1].replace(")", "");
                                } else {
                                    title = "Telafi Dersi";
                                    subtitle = "Tamamlandı";
                                }
                            }
                        } else if (lowerNote.includes("gelmedi") || lowerNote.includes("iptal")) {
                            // ABSENT
                            title = "Katılım Yok";
                            subtitle = "İşlenmedi";
                            iconColor = "text-red-600 bg-red-50";
                            Icon = XCircle;
                        } else if (lowerNote.includes("deneme")) {
                            // TRIAL
                            title = "Deneme Dersi";
                            subtitle = "Tamamlandı";
                            iconColor = "text-purple-600 bg-purple-50";
                            Icon = Sparkles;
                        } else {
                            // REGULAR LESSON - DYNAMIC NUMBERING
                            const num = lessonNumberMap.get(tx.id);
                            if (num) {
                                title = `${num}. Ders`;
                            } else {
                                // Özel ders notu varsa onu göster
                                title = tx.note || "Ders";
                            }
                            subtitle = "Tamamlandı";
                        }

                        return (
                            <div key={tx.id} className="flex gap-3 items-center">
                                {/* Compact Date Column */}
                                <div className="flex flex-col items-center justify-center w-[42px] shrink-0 bg-white py-1 rounded-lg border border-slate-50 shadow-sm z-10">
                                    <span className="text-sm font-black text-slate-700 leading-none">{dayNumber}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">{monthName}</span>
                                </div>

                                {/* Compact Card */}
                                <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-2 active:scale-[0.99] transition-transform">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                                            <Icon size={14} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 leading-none mb-1">{title}</h4>
                                            <p className="text-[10px] font-medium text-slate-400 leading-none">{subtitle}</p>
                                        </div>
                                    </div>

                                    {showAmount && (
                                        <div className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 mr-1">
                                            +{tx.amount}₺
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
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
                        <button 
                            key={res.id} 
                            onClick={() => handleOpenResource(res)}
                            className="w-full text-left group flex items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]"
                        >
                            {/* Icon / Thumbnail */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 mr-4 overflow-hidden shadow-sm ${
                                res.type === 'VIDEO' ? 'bg-red-50 text-red-500' : 
                                res.type === 'PDF' ? 'bg-blue-50 text-blue-500' : 
                                res.type === 'IMAGE' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {res.type === 'IMAGE' ? (
                                    <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                                         <Image size={24} />
                                    </div>
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
                                <Eye size={16} />
                            </div>
                        </button>
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

      {/* PREVIEW MODAL */}
      <Dialog 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        title="Dosya Önizleme"
        actions={
            <>
                <button onClick={() => setIsPreviewOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Kapat</button>
                <button onClick={handleDownload} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                    <Download size={16} /> İndir
                </button>
            </>
        }
      >
          <div className="flex items-center justify-center min-h-[200px] max-h-[60vh] overflow-auto bg-slate-50 rounded-xl p-2 border border-slate-100">
              {isPreviewLoading ? (
                  <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin text-indigo-600" />
                      <span className="text-xs font-bold text-slate-400">Yükleniyor...</span>
                  </div>
              ) : previewContent ? (
                  previewType === 'IMAGE' ? (
                      <img src={previewContent} alt="Preview" className="max-w-full h-auto rounded-lg shadow-sm" />
                  ) : (
                      <iframe src={previewContent} className="w-full h-[300px] rounded-lg" title="PDF Preview"></iframe>
                  )
              ) : (
                  <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} className="text-red-300" />
                      <span className="text-xs font-bold text-slate-400">Dosya görüntülenemedi.</span>
                  </div>
              )}
          </div>
      </Dialog>
    </div>
  );
};
