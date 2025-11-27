
import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarCheck, Banknote, Expand, Star, RefreshCcw } from 'lucide-react';

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

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state } = useCourse();
  
  // UI States
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

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
                            <div className={`text-center py-2 mb-1 ${isToday ? 'bg-[var(--c-100)] rounded-t-xl' : ''}`}>
                                <span className={`block font-black uppercase tracking-wider ${isScreenshotMode ? 'text-[9px] text-slate-800' : 'text-[9px]'} ${isToday ? 'text-[var(--c-700)]' : 'text-slate-400'}`}>
                                    {isScreenshotMode ? FULL_DAYS[day].slice(0,3) : SHORT_DAYS[day]}
                                </span>
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
                                                    relative rounded-md p-1 transition-all duration-200 cursor-pointer active:scale-95
                                                    flex flex-col justify-center
                                                    ${isScreenshotMode ? 'shadow-none border-[0.5px] border-slate-900/10' : 'shadow-sm'}
                                                    
                                                    ${isMakeup ? 'bg-orange-100 text-orange-900' 
                                                        : isTrial ? 'bg-purple-100 text-purple-900' 
                                                        : 'bg-[var(--c-100)] text-[var(--c-900)]'}
                                                `}
                                            >
                                                {/* TIME - Very Small */}
                                                <div className={`text-[6px] font-bold leading-none mb-0.5 opacity-70 flex justify-between items-center ${isMakeup ? 'text-orange-800' : isTrial ? 'text-purple-800' : 'text-[var(--c-700)]'}`}>
                                                    <span>{slot.start}-{slot.end}</span>
                                                    {isTrial && <Star size={6} fill="currentColor" />}
                                                    {isMakeup && <RefreshCcw size={6} />}
                                                </div>

                                                {/* FIRST NAME ONLY - Larger */}
                                                <div className={`text-[10px] font-black leading-tight truncate`}>
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
    </div>
  );
};
