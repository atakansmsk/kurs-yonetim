
import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarCheck, Banknote, Expand, Star, RefreshCcw, Plus, Clock, ArrowRight } from 'lucide-react';
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
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
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
      if (isScreenshotMode) return;

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

  return (
    <div className={`flex flex-col h-full ${isScreenshotMode ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
        
        {/* Header (App Mode Only) */}
        {!isScreenshotMode && (
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
                    onClick={() => setIsScreenshotMode(true)}
                    className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                    title="Tam Ekran / Yazdır"
                >
                    <Expand size={18} />
                </button>
            </div>
        )}

        {/* Screenshot Mode Header */}
        {isScreenshotMode && (
             <div className="p-4 flex items-center justify-between border-b border-slate-100 mb-2">
                 <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{state.schoolName}</h1>
                    <p className="text-xs text-slate-500 font-bold">{state.currentTeacher} — Haftalık Program</p>
                 </div>
                 <button onClick={() => setIsScreenshotMode(false)} className="px-4 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">Kapat</button>
             </div>
        )}

        {/* Grid Content */}
        <div className={`flex-1 overflow-y-auto ${isScreenshotMode ? 'p-1' : 'p-2'}`}>
            <div className={`grid gap-1 content-start h-full grid-cols-7`}>
                {DAYS.map((day) => {
                    const isToday = day === currentDayName && !isScreenshotMode;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-xl transition-colors duration-300 ${isToday ? 'bg-[var(--c-50)]/50 ring-1 ring-[var(--c-200)]' : 'bg-transparent'}`}>
                            
                            {/* Day Header */}
                            <div 
                                onClick={() => handleDayClick(day)}
                                className={`text-center py-2 mb-1 group cursor-pointer transition-colors ${isToday ? 'bg-[var(--c-100)] rounded-t-xl' : 'hover:bg-slate-50 rounded-xl'}`}
                            >
                                <span className={`block font-black uppercase tracking-wider ${isScreenshotMode ? 'text-[9px] text-slate-800' : 'text-[9px]'} ${isToday ? 'text-[var(--c-700)]' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                    {isScreenshotMode ? FULL_DAYS[day].slice(0,3) : SHORT_DAYS[day]}
                                </span>
                                {!isScreenshotMode && <div className="h-0.5 w-0 bg-indigo-500 mx-auto transition-all group-hover:w-4 rounded-full mt-0.5"></div>}
                            </div>

                            {/* Stacked Lessons */}
                            <div className={`flex flex-col px-0.5 pb-2 h-full gap-1`}>
                                {slots.length === 0 ? (
                                    <div className="h-full border-l border-dashed border-slate-200 mx-auto w-px opacity-30 min-h-[50px]"></div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        
                                        if (!isOccupied) return null; // Show only occupied slots

                                        // Sadece İsim (İlk kelime)
                                        const firstName = student?.name.trim().split(' ')[0] || "Öğrenci";

                                        return (
                                            <div 
                                                key={slot.id}
                                                onClick={() => slot.studentId && onOpenStudentProfile(slot.studentId)}
                                                className={`
                                                    relative rounded-md p-1.5 transition-all duration-200 cursor-pointer active:scale-95
                                                    flex flex-col
                                                    ${isScreenshotMode ? 'shadow-none border-[0.5px] border-slate-900/10' : 'shadow-sm'}
                                                    
                                                    ${isMakeup ? 'bg-orange-100 text-orange-900' 
                                                        : isTrial ? 'bg-purple-100 text-purple-900' 
                                                        : 'bg-[var(--c-100)] text-[var(--c-900)]'}
                                                `}
                                            >
                                                {/* TIME - Very Small at Top */}
                                                <div className={`text-[6px] font-bold leading-none mb-1 opacity-60 flex justify-between items-center ${isMakeup ? 'text-orange-800' : isTrial ? 'text-purple-800' : 'text-[var(--c-700)]'}`}>
                                                    <span>{slot.start}-{slot.end}</span>
                                                    {isTrial && <Star size={6} fill="currentColor" />}
                                                    {isMakeup && <RefreshCcw size={6} />}
                                                </div>

                                                {/* NAME - Large at Bottom */}
                                                <div className={`text-[7px] font-black leading-tight break-words`}>
                                                    {firstName}
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

        {/* Gap Finder Modal */}
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
    </div>
  );
};
