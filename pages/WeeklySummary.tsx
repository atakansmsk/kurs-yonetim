import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot } from '../types';
import { CalendarCheck, Star, RefreshCcw, ArrowRightLeft, MousePointerClick, XCircle, Expand, Banknote } from 'lucide-react';

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
  
  // --- UI STATES ---
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveSource, setMoveSource] = useState<{ day: WeekDay, slot: LessonSlot } | null>(null);

  // --- STATS & EARNINGS ---
  const { stats, monthlyEarnings } = useMemo(() => {
    let totalRegular = 0, totalMakeup = 0, totalTrial = 0;
    const uniqueStudentIds = new Set<string>();

    DAYS.forEach(day => {
        const key = `${state.currentTeacher}|${day}`;
        (state.schedule[key] || []).forEach(s => {
            if (s.studentId) {
                uniqueStudentIds.add(s.studentId);
                if (s.label === 'TRIAL') totalTrial++;
                else if (s.label === 'MAKEUP') totalMakeup++;
                else totalRegular++;
            }
        });
    });

    // Calculate Earnings based on unique students assigned to this teacher
    let earnings = 0;
    uniqueStudentIds.forEach(id => {
        const student = state.students[id];
        if (student) {
            earnings += student.fee || 0;
        }
    });

    return { 
        stats: { totalRegular, totalMakeup, totalTrial, total: totalRegular + totalMakeup + totalTrial },
        monthlyEarnings: earnings
    };
  }, [state.schedule, state.currentTeacher, state.students]);

  const todayIndex = new Date().getDay(); 
  const jsDayToAppKey: Record<number, WeekDay> = { 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar" };
  const currentDayName = jsDayToAppKey[todayIndex];

  // --- HANDLERS ---
  const getDaySlots = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      return (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  };

  const handleSlotClick = (day: WeekDay, slot: LessonSlot) => {
      // 1. Eğer Taşıma Modu AÇIKSA
      if (isMoveMode) {
          if (!moveSource) {
              // Kaynak Seçimi (Sadece dolu dersler seçilebilir)
              if (slot.studentId) {
                  setMoveSource({ day, slot });
              }
          } else {
              // Hedef Seçimi
              // Kendi üzerine tıkladıysa iptal et
              if (moveSource.day === day && moveSource.slot.id === slot.id) {
                  setMoveSource(null);
                  return;
              }

              // Hedef dolu mu? -> SWAP
              if (slot.studentId) {
                  if (confirm("Dersler yer değiştirsin mi?")) {
                      actions.swapSlots(moveSource.day, moveSource.slot.id, day, slot.id);
                  }
              } 
              // Hedef boş mu? -> MOVE
              else {
                  actions.moveSlot(moveSource.day, moveSource.slot.id, day, slot.id);
              }
              // İşlem bitince seçimi temizle ama modu açık tut (seri işlem için)
              setMoveSource(null);
          }
      } 
      // 2. Taşıma Modu KAPALIYSA -> Profil Aç
      else {
          if (slot.studentId) {
              onOpenStudentProfile(slot.studentId);
          }
      }
  };

  const handleEmptyDayClick = (day: WeekDay) => {
      // Eğer kaynak seçiliyse ve boş bir güne (slotsuz alana değil ama mantıken slot listesine) tıklandıysa...
      // Aslında Stacked yapıda boş alana tıklamak zordur, slotlara tıklanır.
      // Bu fonksiyonu şimdilik pasif bırakıyoruz çünkü slotlara tıklanarak işlem yapılıyor.
  };

  return (
    <div className={`flex flex-col h-full ${isScreenshotMode ? 'bg-white' : 'bg-[#F8FAFC]'}`}>
        
        {/* Header (App Mode Only) */}
        {!isScreenshotMode && (
            <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-sm">
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
                
                <div className="flex gap-2">
                    {/* Move Mode Toggle */}
                    <button 
                        onClick={() => { setIsMoveMode(!isMoveMode); setMoveSource(null); }}
                        className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center gap-2 ${isMoveMode ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                    >
                        {isMoveMode ? <XCircle size={18} /> : <ArrowRightLeft size={18} />}
                        {isMoveMode && <span className="text-[10px] font-bold animate-in fade-in">Bitti</span>}
                    </button>

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

        {/* Info Banner (Move Mode) */}
        {isMoveMode && !isScreenshotMode && (
            <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-center gap-2 sticky top-[65px] z-20">
                <MousePointerClick size={14} className="text-indigo-600 animate-bounce" />
                <span className="text-[10px] font-bold text-indigo-700">
                    {moveSource ? "Şimdi hedef kutuyu seçin..." : "Taşımak istediğiniz derse dokunun."}
                </span>
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
            <div className={`grid gap-1.5 content-start h-full ${isScreenshotMode ? 'grid-cols-7' : 'grid-cols-7'}`}>
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
                            <div className={`flex flex-col px-1 pb-2 h-full ${isScreenshotMode ? 'gap-0.5' : 'gap-1'}`}>
                                {slots.length === 0 ? (
                                    <div className="h-full border-l border-dashed border-slate-200 mx-auto w-px opacity-50 min-h-[50px]"></div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        
                                        // Move State Visuals
                                        const isSelected = moveSource?.slot.id === slot.id;
                                        const isDimmed = isMoveMode && moveSource && !isSelected && !isOccupied; // Target candidate (empty)
                                        const isSwapTarget = isMoveMode && moveSource && !isSelected && isOccupied; // Target candidate (swap)

                                        return (
                                            <div 
                                                key={slot.id}
                                                onClick={() => handleSlotClick(day, slot)}
                                                className={`
                                                    relative group rounded-md p-1.5 transition-all duration-200
                                                    ${isScreenshotMode ? 'border-[0.5px] shadow-none' : 'shadow-sm border-l-[3px]'}
                                                    ${isMoveMode && isOccupied ? 'cursor-pointer' : ''}
                                                    ${isSelected ? 'ring-2 ring-indigo-500 scale-95 z-10' : ''}
                                                    ${isSwapTarget ? 'hover:ring-2 hover:ring-indigo-300 hover:scale-95 cursor-pointer' : ''}
                                                    
                                                    ${isOccupied 
                                                        ? 'bg-white' 
                                                        : 'bg-slate-50/50 border border-slate-100/50 border-dashed'}
                                                    
                                                    ${!isOccupied && moveSource ? 'animate-pulse bg-indigo-50/30 border-indigo-200 cursor-pointer' : ''}

                                                    ${isOccupied && isMakeup ? 'border-l-orange-400' 
                                                        : isOccupied && isTrial ? 'border-l-purple-400' 
                                                        : isOccupied ? 'border-l-[var(--c-500)]' : ''}
                                                `}
                                            >
                                                {isOccupied ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        {/* Time Range */}
                                                        <div className="flex justify-between items-start">
                                                            <span className={`font-bold opacity-80 leading-none ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'} ${isMakeup?'text-orange-600':isTrial?'text-purple-600':'text-[var(--c-600)]'}`}>
                                                                {slot.start} - {slot.end}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Student Name */}
                                                        <div className={`font-black leading-tight truncate ${isScreenshotMode ? 'text-[8px]' : 'text-[10px]'} ${isMakeup?'text-orange-900':isTrial?'text-purple-900':'text-slate-800'}`}>
                                                            {student?.name}
                                                        </div>
                                                        
                                                        {(isMakeup || isTrial) && !isScreenshotMode && (
                                                            <div className="flex justify-end mt-0.5">
                                                                {isTrial && <Star size={8} className="text-purple-500" fill="currentColor"/>}
                                                                {isMakeup && <RefreshCcw size={8} className="text-orange-500"/>}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // Empty Slot
                                                    <div className={`flex items-center justify-center ${isScreenshotMode ? 'h-4' : 'h-6'}`}>
                                                        <span className={`font-medium text-slate-300 ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'}`}>
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
    </div>
  );
};