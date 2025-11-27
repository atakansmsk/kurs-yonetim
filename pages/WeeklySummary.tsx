import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot } from '../types';
import { CalendarCheck, Star, RefreshCcw, GripVertical } from 'lucide-react';

interface WeeklySummaryProps {
    onOpenStudentProfile: (id: string) => void;
}

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", "Salı": "SAL", "Çarşamba": "ÇAR", "Perşembe": "PER", "Cuma": "CUM", "Cmt": "CMT", "Pazar": "PAZ"
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state, actions } = useCourse();

  // --- DRAG & DROP STATE ---
  const [draggingSlot, setDraggingSlot] = useState<{ day: WeekDay, slot: LessonSlot } | null>(null);

  // Stats Calculation
  const stats = useMemo(() => {
    let totalRegular = 0, totalMakeup = 0, totalTrial = 0;
    DAYS.forEach(day => {
        const key = `${state.currentTeacher}|${day}`;
        (state.schedule[key] || []).forEach(s => {
            if (s.studentId) {
                if (s.label === 'TRIAL') totalTrial++;
                else if (s.label === 'MAKEUP') totalMakeup++;
                else totalRegular++;
            }
        });
    });
    return { totalRegular, totalMakeup, totalTrial, total: totalRegular + totalMakeup + totalTrial };
  }, [state.schedule, state.currentTeacher]);

  const todayIndex = new Date().getDay(); 
  const jsDayToAppKey: Record<number, WeekDay> = { 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar" };
  const currentDayName = jsDayToAppKey[todayIndex];

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.DragEvent, day: WeekDay, slot: LessonSlot) => {
      setDraggingSlot({ day, slot });
      // Veriyi transfer nesnesine de koyalım (görsel efekt için gerekebilir)
      e.dataTransfer.setData('application/json', JSON.stringify({ day, slotId: slot.id }));
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Drop'a izin ver
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDay: WeekDay, targetSlot: LessonSlot) => {
      e.preventDefault();
      
      if (!draggingSlot) return;

      const sourceDay = draggingSlot.day;
      const sourceSlot = draggingSlot.slot;
      
      // Kendi üzerine bırakılırsa iptal
      if (sourceDay === targetDay && sourceSlot.id === targetSlot.id) {
          setDraggingSlot(null);
          return;
      }

      // Hedef dolu mu? -> SWAP
      if (targetSlot.studentId) {
          if (confirm(`"${state.students[sourceSlot.studentId!]?.name}" ile "${state.students[targetSlot.studentId]?.name}" yer değiştirsin mi?`)) {
              actions.swapSlots(sourceDay, sourceSlot.id, targetDay, targetSlot.id);
          }
      } 
      // Hedef boş mu? -> MOVE
      else {
          actions.moveSlot(sourceDay, sourceSlot.id, targetDay, targetSlot.id);
      }
      
      setDraggingSlot(null);
  };

  const getDaySlots = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      return (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* Header */}
        <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-[var(--c-600)] text-white flex items-center justify-center shadow-md shadow-[var(--c-200)]">
                    <CalendarCheck size={16} />
                 </div>
                 <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
            </div>
            <div className="flex gap-1.5">
                <span className="px-2 py-0.5 bg-[var(--c-50)] text-[var(--c-700)] text-[9px] font-bold rounded-md border border-[var(--c-100)]">{stats.total} Ders</span>
                {stats.totalTrial > 0 && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold rounded-md border border-purple-100">{stats.totalTrial} Deneme</span>}
            </div>
        </div>

        {/* 7-Column Stacked Grid */}
        <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-7 gap-1.5 h-full content-start">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-xl transition-colors duration-300 ${isToday ? 'bg-[var(--c-50)]/50 ring-1 ring-[var(--c-200)]' : 'bg-transparent'}`}>
                            
                            {/* Day Header */}
                            <div className={`text-center py-2 mb-1 ${isToday ? 'bg-[var(--c-100)] rounded-t-xl' : ''}`}>
                                <span className={`block text-[9px] font-black uppercase tracking-wider ${isToday ? 'text-[var(--c-700)]' : 'text-slate-400'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                            </div>

                            {/* Stacked Lessons */}
                            <div className="flex flex-col gap-1 px-1 pb-2 h-full">
                                {slots.length === 0 ? (
                                    <div className="h-full border-l border-dashed border-slate-200 mx-auto w-px opacity-50"></div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        const isDraggingMe = draggingSlot?.slot.id === slot.id;

                                        return (
                                            <div 
                                                key={slot.id}
                                                draggable={isOccupied} // Sadece dolu olanlar sürüklenebilir
                                                onDragStart={(e) => handleDragStart(e, day, slot)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, day, slot)}
                                                
                                                onClick={() => isOccupied && onOpenStudentProfile(slot.studentId!)}
                                                
                                                className={`
                                                    relative group rounded-md p-1.5 transition-all duration-200
                                                    ${isDraggingMe ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
                                                    ${isOccupied 
                                                        ? 'bg-white shadow-sm cursor-pointer hover:shadow-md border-l-[3px]' 
                                                        : 'bg-slate-50/50 border border-slate-100/50 border-dashed hover:bg-indigo-50/50 hover:border-indigo-200'}
                                                    ${isOccupied && isMakeup ? 'border-l-orange-400' 
                                                        : isOccupied && isTrial ? 'border-l-purple-400' 
                                                        : isOccupied ? 'border-l-[var(--c-500)]' : ''}
                                                `}
                                            >
                                                {isOccupied ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex justify-between items-start">
                                                            <span className={`text-[7px] font-bold opacity-70 ${isMakeup?'text-orange-600':isTrial?'text-purple-600':'text-[var(--c-600)]'}`}>
                                                                {slot.start}
                                                            </span>
                                                            {/* Drag Handle Icon (Visible on hover) */}
                                                            <GripVertical size={8} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                                        </div>
                                                        <div className={`text-[8px] font-bold leading-tight truncate ${isMakeup?'text-orange-900':isTrial?'text-purple-900':'text-slate-700'}`}>
                                                            {student?.name.split(' ')[0]}
                                                        </div>
                                                        {(isMakeup || isTrial) && (
                                                            <div className="flex justify-end">
                                                                {isTrial && <Star size={6} className="text-purple-500" fill="currentColor"/>}
                                                                {isMakeup && <RefreshCcw size={6} className="text-orange-500"/>}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-6 flex items-center justify-center">
                                                        <span className="text-[7px] font-medium text-slate-300">{slot.start}</span>
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