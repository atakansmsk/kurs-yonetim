
import React from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", 
  "Salı": "SAL", 
  "Çarşamba": "ÇAR", 
  "Perşembe": "PER", 
  "Cuma": "CUM", 
  "Cmt": "CMT", 
  "Pazar": "PAZ"
};

export const WeeklySummary: React.FC = () => {
  const { state } = useCourse();

  // Tüm haftanın ders sayısını hesapla
  const totalLessons = DAYS.reduce((acc, day) => {
    const key = `${state.currentTeacher}|${day}`;
    const count = (state.schedule[key] || []).filter(s => s.studentId).length;
    return acc + count;
  }, 0);

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar">
        {/* Ultra Compact Header */}
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
            <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
                <span className="text-[9px] font-medium text-slate-400">Haftalık</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                <span className="text-[10px] font-black text-slate-800">{totalLessons}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Ders</span>
            </div>
        </div>
        
        {/* 3-2-2 Grid Layout */}
        <div className="p-1 pb-20">
            <div className="grid grid-cols-6 gap-1">
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    // LOGIC: 
                    // Index 0,1,2 (Pzt, Sal, Çar) -> col-span-2 (3 items per row)
                    // Index 3,4,5 (Per, Cum) -> col-span-3 (2 items per row)
                    // Index 6,7 (Cmt, Paz) -> col-span-3 (2 items per row) - but highlighted
                    
                    // index 0-2: Row 1
                    // index 3-4: Row 2
                    // index 5-6: Row 3 (Weekend)
                    const isTopRow = index < 3;
                    const isWeekend = index > 4; // Cmt(5), Paz(6)
                    const colSpan = isTopRow ? 'col-span-2' : 'col-span-3';

                    return (
                        <div 
                            key={day} 
                            className={`${colSpan} flex flex-col border rounded-[6px] overflow-hidden shadow-sm transition-all ${
                                isWeekend 
                                ? 'bg-indigo-50/30 border-indigo-100' 
                                : 'bg-white border-slate-200'
                            }`}
                        >
                            {/* Day Header - Ultra Compact */}
                            <div className={`px-2 py-1 flex justify-between items-center border-b ${
                                isWeekend ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'
                            }`}>
                                <span className={`text-[9px] font-black tracking-wider ${isWeekend ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                                {slots.length > 0 && (
                                    <span className={`text-[8px] font-bold ${isWeekend ? 'text-indigo-400' : 'text-slate-400'}`}>
                                        {slots.length}
                                    </span>
                                )}
                            </div>

                            {/* Dense Lesson List */}
                            <div className="p-0.5 min-h-[40px] flex-1">
                                {slots.length === 0 ? (
                                    <div className="h-full w-full flex items-center justify-center py-1">
                                        <span className="text-[8px] text-slate-300 font-medium opacity-50">-</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-px">
                                        {slots.map((slot, i) => {
                                            const student = state.students[slot.studentId!];
                                            const isMakeup = slot.label === 'MAKEUP';
                                            return (
                                                <div key={slot.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-[3px] ${
                                                    isMakeup ? 'bg-orange-50' : (isWeekend ? 'bg-white' : (i % 2 === 0 ? 'bg-slate-50' : 'bg-white'))
                                                }`}>
                                                    <span className={`text-[7px] font-black shrink-0 tracking-tighter ${isMakeup ? 'text-orange-600' : 'text-slate-400'}`}>
                                                        {slot.start}-{slot.end}
                                                    </span>
                                                    <span className={`text-[8px] font-bold truncate leading-tight flex-1 ${isMakeup ? 'text-orange-900' : 'text-slate-700'}`}>
                                                        {student?.name}
                                                    </span>
                                                    {isMakeup && <span className="text-[6px] font-bold text-white bg-orange-400 px-0.5 rounded-[2px]">T</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Minimal Watermark */}
            <div className="mt-6 text-center opacity-20">
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-900">Kurs Yönetim Pro</span>
            </div>
        </div>
    </div>
  );
};
