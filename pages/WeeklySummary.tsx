import React, { useMemo, useState, useRef } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot } from '../types';
import { CalendarCheck, Star, RefreshCcw, Banknote, Expand, Layers } from 'lucide-react';

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
  const { state, actions } = useCourse();
  
  // UI States
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [moveSource, setMoveSource] = useState<{ day: WeekDay, slot: LessonSlot } | null>(null);

  // Long Press Refs
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // --- LONG PRESS LOGIC ---
  const handleTouchStart = (day: WeekDay, slot: LessonSlot) => {
      if (!slot.studentId) return; // Boş slot taşınmaz
      
      // Timer başlat
      timerRef.current = setTimeout(() => {
          setMoveSource({ day, slot });
          if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
      }, 600); // 600ms basılı tutunca tetiklenir
  };

  const handleTouchEnd = () => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
      }
  };

  const handleTouchMove = () => {
      // Eğer parmak kayarsa (scroll yaparsa) iptal et
      if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
      }
  };

  const handleClick = (day: WeekDay, slot: LessonSlot) => {
      // Eğer kaynak seçiliyse -> HEDEF İŞLEMİ
      if (moveSource) {
          // Kendi üzerine tıkladıysa iptal
          if (moveSource.day === day && moveSource.slot.id === slot.id) {
              setMoveSource(null);
              return;
          }

          if (slot.studentId) {
             // Hedef dolu -> SWAP
             if (window.confirm("Derslerin yerini değiştirmek istiyor musunuz?")) {
                 actions.swapSlots(moveSource.day, moveSource.slot.id, day, slot.id);
             }
          } else {
             // Hedef boş -> MOVE
             actions.moveSlot(moveSource.day, moveSource.slot.id, day, slot.id);
          }
          setMoveSource(null);
      } 
      // Kaynak seçili değilse -> PROFİL AÇ
      else {
          if (slot.studentId) {
              onOpenStudentProfile(slot.studentId);
          }
      }
  };

  // Hedef Boş Alana Tıklama (Günü yakalamak için opsiyonel, genelde slotlara tıklanır)
  // Stacked yapıda boş alana tıklamak zordur, o yüzden slot mantığı yeterli.

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
                
                <div className="flex gap-2 items-center">
                    {/* Move Source Indicator */}
                    {moveSource && (
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 animate-pulse mr-2">
                             <Layers size={14} className="text-indigo-600" />
                             <span className="text-[10px] font-bold text-indigo-700">Taşınıyor...</span>
                             <button onClick={() => setMoveSource(null)} className="ml-1 text-xs font-black text-slate-400">X</button>
                        </div>
                    )}

                    {/* Screenshot Toggle */}
                    <button 
                        onClick={() => setIsScreenshotMode(true)}
                        className="p-2 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                    >
                        <Expand size={18} />
                    </button>
                </div>
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
            <div className={`grid gap-1.5 content-start h-full grid-cols-7`}>
                {DAYS.map((day) => {
                    const isToday = day === currentDayName && !isScreenshotMode;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-xl transition-colors duration-300 ${isToday ? 'bg-[var(--c-50)]/50 ring-1 ring-[var(--c-200)]' : 'bg-transparent'}`}>
                            
                            {/* Day Header */}
                            <div className={`text-center py-2 mb-1 ${isToday ? 'bg-[var(--c-100)] rounded-t-xl' : ''}`}>
                                <span className={`block font-black uppercase tracking-wider ${isScreenshotMode ? 'text-[9px] text-slate-800' : 'text-[9px]'} ${isToday ? 'text-[var(--c-700)]' : 'text-slate-400'}`}>
                                    {isScreenshotMode ? FULL_DAYS[day] : SHORT_DAYS[day]}
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
                                        
                                        // Visual States
                                        const isSelectedSource = moveSource?.slot.id === slot.id;
                                        const isMoveTarget = moveSource && !isSelectedSource;

                                        return (
                                            <div 
                                                key={slot.id}
                                                // Mouse Click
                                                onClick={() => handleClick(day, slot)}
                                                // Touch Long Press
                                                onTouchStart={() => handleTouchStart(day, slot)}
                                                onTouchEnd={handleTouchEnd}
                                                onTouchMove={handleTouchMove}
                                                // Desktop Long Press simulation (mousedown + timer)
                                                onMouseDown={() => handleTouchStart(day, slot)}
                                                onMouseUp={handleTouchEnd}
                                                onMouseLeave={handleTouchEnd}

                                                className={`
                                                    relative rounded-lg p-1.5 transition-all duration-200 select-none
                                                    ${isScreenshotMode ? 'border-[0.5px] shadow-none' : 'shadow-sm border-l-[3px]'}
                                                    
                                                    ${isSelectedSource ? 'ring-2 ring-indigo-500 scale-95 z-20 opacity-80' : ''}
                                                    ${isMoveTarget ? 'opacity-60 hover:opacity-100 hover:scale-105' : ''}
                                                    
                                                    ${isOccupied 
                                                        ? 'bg-white' 
                                                        : 'bg-slate-50/50 border border-slate-100/50 border-dashed hover:bg-indigo-50/50'}

                                                    ${isOccupied && isMakeup ? 'border-l-orange-400' 
                                                        : isOccupied && isTrial ? 'border-l-purple-400' 
                                                        : isOccupied ? 'border-l-[var(--c-500)]' : ''}
                                                `}
                                            >
                                                {isOccupied ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        {/* Time Range */}
                                                        <div className="flex justify-between items-start">
                                                            <span className={`font-bold leading-none ${isScreenshotMode ? 'text-[7px]' : 'text-[9px]'} ${isMakeup?'text-orange-600':isTrial?'text-purple-600':'text-[var(--c-600)]'}`}>
                                                                {slot.start}-{slot.end}
                                                            </span>
                                                            {(isMakeup || isTrial) && !isScreenshotMode && (
                                                                <div className="flex">
                                                                    {isTrial && <Star size={8} className="text-purple-500" fill="currentColor"/>}
                                                                    {isMakeup && <RefreshCcw size={8} className="text-orange-500"/>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Student Name */}
                                                        <div className={`font-black leading-tight truncate mt-0.5 ${isScreenshotMode ? 'text-[9px]' : 'text-[11px]'} ${isMakeup?'text-orange-900':isTrial?'text-purple-900':'text-slate-900'}`}>
                                                            {student?.name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Empty Slot
                                                    <div className={`flex flex-col items-center justify-center ${isScreenshotMode ? 'py-1' : 'py-1.5'}`}>
                                                        <span className={`font-medium text-slate-300 ${isScreenshotMode ? 'text-[7px]' : 'text-[9px]'}`}>
                                                            {slot.start}
                                                        </span>
                                                    </div>
                                                )}
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
        
        {/* Helper Toast for Long Press */}
        {!isScreenshotMode && !moveSource && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm pointer-events-none opacity-0 animate-[fadeIn_3s_ease-in-out_1s_forwards]">
                İpucu: Taşımak için derse basılı tutun
            </div>
        )}
    </div>
  );
};