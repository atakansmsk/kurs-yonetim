
import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarCheck, Banknote, Expand, Star, RefreshCcw, Plus, Clock, ArrowRight, Printer, X } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface WeeklySummaryProps {
    onOpenStudentProfile: (id: string) => void;
}

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", "Salı": "SAL", "Çarşamba": "ÇAR", "Perşembe": "PER", "Cuma": "CUM", "Cmt": "CMT", "Pazar": "PAZ"
};

const FULL_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PAZARTESİ", "Salı": "SALI", "Çarşamba": "ÇARŞAMBA", "Perşembe": "PERŞEMBE", "Cuma": "CUMA", "Cmt": "CUMARTESİ", "Pazar": "PAZAR"
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state, actions } = useCourse();
  
  // UI States
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [gapModalData, setGapModalData] = useState<{day: WeekDay, gaps: string[]} | null>(null);

  // --- STATS & EARNINGS ---
  const { monthlyEarnings } = useMemo(() => {
    const uniqueStudentIds = new Set<string>();
    DAYS.forEach(day => {
        const key = `${state.currentTeacher}|${day}`;
        (state.schedule[key] || []).forEach(s => {
            if (s.studentId) uniqueStudentIds.add(s.studentId);
        });
    });

    let earnings = 0;
    uniqueStudentIds.forEach(id => {
        const student = state.students[id];
        if (student) earnings += student.fee || 0;
    });

    return { monthlyEarnings: earnings };
  }, [state.schedule, state.currentTeacher, state.students]);

  const todayIndex = new Date().getDay(); 
  const jsDayToAppKey: Record<number, WeekDay> = { 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar" };
  const currentDayName = jsDayToAppKey[todayIndex];

  // --- HANDLERS ---
  const getDaySlots = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      return (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  };

  const handleDayClick = (day: WeekDay) => {
      if (isPrintMode) return;

      const slots = getDaySlots(day);
      const foundGaps: string[] = [];
      
      // Scan from 15:00 to 21:00
      let currentPointer = 15 * 60; 
      const END_OF_DAY = 21 * 60;
      const SLOT_DURATION = 40;

      // Filter slots that end after scan start
      const relevantSlots = slots.filter(s => timeToMinutes(s.end) > currentPointer);

      relevantSlots.forEach(slot => {
          const s = timeToMinutes(slot.start);
          const e = timeToMinutes(slot.end);
          
          if (e > currentPointer) {
               // Check gap before this slot
               while (currentPointer + SLOT_DURATION <= s) {
                   foundGaps.push(minutesToTime(currentPointer));
                   currentPointer += SLOT_DURATION;
               }
               currentPointer = Math.max(currentPointer, e);
          }
      });

      // Check remaining time
      while (currentPointer + SLOT_DURATION <= END_OF_DAY) {
          foundGaps.push(minutesToTime(currentPointer));
          currentPointer += SLOT_DURATION;
      }

      setGapModalData({ day, gaps: foundGaps });
  };

  const handleAddGap = (startTime: string) => {
      if (gapModalData) {
          const startMins = timeToMinutes(startTime);
          const endMins = startMins + 40;
          const endTime = minutesToTime(endMins);
          actions.addSlot(gapModalData.day, startTime, endTime);
          setGapModalData(null);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className={`flex flex-col h-full ${isPrintMode ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
        
        {/* CSS for Print */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-container { padding: 0 !important; overflow: visible !important; height: auto !important; }
            body { background: white; }
          }
        `}</style>

        {/* Header (App Mode Only) */}
        {!isPrintMode && (
            <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-sm animate-slide-up">
                <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-[var(--c-600)] text-white flex items-center justify-center shadow-lg shadow-[var(--c-200)]">
                        <CalendarCheck size={20} />
                     </div>
                     <div>
                         <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{state.currentTeacher}</h2>
                         <div className="flex items-center gap-1 mt-1 text-emerald-600">
                             <Banknote size={10} />
                             <span className="text-[10px] font-bold">{monthlyEarnings.toLocaleString('tr-TR')} ₺ / Ay</span>
                         </div>
                     </div>
                </div>
                
                <button 
                    onClick={() => setIsPrintMode(true)}
                    className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 flex items-center gap-2"
                    title="Yazdır / Tablo Görünümü"
                >
                    <Printer size={18} />
                </button>
            </div>
        )}

        {/* Print Mode Header */}
        {isPrintMode && (
             <div className="p-4 flex items-center justify-between border-b border-slate-200 mb-2 no-print bg-slate-50">
                 <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tablo Görünümü</h1>
                    <p className="text-xs text-slate-500 font-bold">Çıktı almak için 'Yazdır' butonuna basın.</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setIsPrintMode(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-2">
                        <X size={16} /> Kapat
                    </button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-md flex items-center gap-2">
                        <Printer size={16} /> Yazdır
                    </button>
                 </div>
             </div>
        )}

        {/* Print Header (Visible only on Paper) */}
        {isPrintMode && (
             <div className="hidden print:block mb-4 text-center pt-4">
                 <h1 className="text-2xl font-black text-black uppercase">{state.schoolName}</h1>
                 <p className="text-sm text-slate-600">{state.currentTeacher} — Haftalık Ders Programı</p>
             </div>
        )}

        {/* Grid Content */}
        <div className={`flex-1 overflow-y-auto print-container ${isPrintMode ? 'p-4' : 'p-2'}`}>
            <div className={`grid gap-1 content-start h-full grid-cols-7 ${isPrintMode ? 'gap-0 border border-slate-300' : 'gap-1'}`}>
                {DAYS.map((day, dayIdx) => {
                    const isToday = day === currentDayName && !isPrintMode;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 transition-colors duration-300 ${isPrintMode ? 'border-r last:border-r-0 border-slate-300' : `rounded-xl ${isToday ? 'bg-[var(--c-50)]/50 ring-1 ring-[var(--c-200)]' : 'bg-transparent'}`}`}>
                            
                            {/* Day Header */}
                            <div 
                                onClick={() => handleDayClick(day)}
                                className={`text-center py-2 mb-1 group cursor-pointer transition-colors 
                                    ${isPrintMode 
                                        ? 'bg-slate-100 border-b border-slate-300 text-black py-3 mb-0' 
                                        : isToday ? 'bg-[var(--c-100)] rounded-t-xl' : 'hover:bg-slate-50 rounded-xl'
                                    }`}
                            >
                                <span className={`block font-black uppercase tracking-wider ${isPrintMode ? 'text-[10px]' : 'text-[9px]'} ${!isPrintMode && isToday ? 'text-[var(--c-700)]' : 'text-slate-600'}`}>
                                    {isPrintMode ? FULL_DAYS[day].slice(0,3) : SHORT_DAYS[day]}
                                </span>
                                {!isPrintMode && <div className="h-0.5 w-0 bg-indigo-500 mx-auto transition-all group-hover:w-4 rounded-full mt-0.5"></div>}
                            </div>

                            {/* Stacked Lessons */}
                            <div className={`flex flex-col h-full gap-1 ${isPrintMode ? 'p-0' : 'px-0.5 pb-2'}`}>
                                {slots.length === 0 ? (
                                    <div className={`h-full mx-auto w-px min-h-[50px] ${isPrintMode ? 'bg-transparent' : 'border-l border-dashed border-slate-200 opacity-30'}`}></div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        
                                        if (!isOccupied) return null; // Show only occupied slots

                                        const firstName = student?.name.trim().split(' ')[0] || "Öğrenci";
                                        const lastNameInitial = student?.name.trim().split(' ').slice(1).map(n=>n[0]).join('') || "";

                                        return (
                                            <div 
                                                key={slot.id}
                                                onClick={() => !isPrintMode && slot.studentId && onOpenStudentProfile(slot.studentId)}
                                                className={`
                                                    relative flex flex-col justify-center
                                                    ${isPrintMode 
                                                        ? 'border-b border-slate-200 p-1 min-h-[50px] text-center bg-white' 
                                                        : `rounded-md p-1.5 shadow-sm cursor-pointer active:scale-95 transition-all duration-200 ${isMakeup ? 'bg-orange-100 text-orange-900' : isTrial ? 'bg-purple-100 text-purple-900' : 'bg-[var(--c-100)] text-[var(--c-900)]'}`
                                                    }
                                                `}
                                            >
                                                {/* TIME */}
                                                <div className={`text-[6px] font-bold leading-none mb-1 flex justify-center items-center ${isPrintMode ? 'text-slate-500' : 'opacity-60'}`}>
                                                    <span>{slot.start}-{slot.end}</span>
                                                    {!isPrintMode && isTrial && <Star size={6} fill="currentColor" className="ml-1"/>}
                                                    {!isPrintMode && isMakeup && <RefreshCcw size={6} className="ml-1"/>}
                                                </div>

                                                {/* NAME */}
                                                <div className={`font-black leading-tight break-words ${isPrintMode ? 'text-[9px] text-black' : 'text-[7px]'}`}>
                                                    {firstName} {isPrintMode && lastNameInitial}
                                                    {isPrintMode && isMakeup && <span className="block text-[6px] font-bold text-slate-500">(T)</span>}
                                                    {isPrintMode && isTrial && <span className="block text-[6px] font-bold text-slate-500">(D)</span>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Gap Finder Modal (Only in App Mode) */}
        {!isPrintMode && (
            <Dialog 
                isOpen={!!gapModalData} 
                onClose={() => setGapModalData(null)} 
                title={gapModalData ? `${gapModalData.day} - Boşluklar` : "Boşluklar"}
            >
                <div className="py-2">
                    {gapModalData?.gaps.length === 0 ? (
                        <div className="text-center py-4">
                            <Clock className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-slate-400 text-sm font-medium">15:00 - 21:00 arası uygun boşluk yok.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
                            {gapModalData?.gaps.map(startTime => {
                                const endMins = timeToMinutes(startTime) + 40;
                                const endTime = minutesToTime(endMins);
                                return (
                                    <button 
                                        key={startTime} 
                                        onClick={() => handleAddGap(startTime)} 
                                        className="p-3 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-center group"
                                    >
                                        <span className="text-lg font-bold text-slate-700 block group-hover:text-indigo-700">{startTime}</span>
                                        <span className="text-xs text-slate-400 group-hover:text-indigo-400">{endTime}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Dialog>
        )}
    </div>
  );
};
