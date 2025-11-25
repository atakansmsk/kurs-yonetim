
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
        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
            <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
                <span className="text-[9px] font-medium text-slate-400">Haftalık</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
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
                    // Index 3,4,5,6 (Per, Cum, Cmt, Paz) -> col-span-3 (2 items per row)
                    const isTopRow = index < 3;
                    const colSpan = isTopRow ? 'col-span-2' : 'col-span-3';

                    return (
                        <div 
                            key={day} 
                            className={`${colSpan} flex flex-col border border-slate-200 rounded-[4px] overflow-hidden bg-white shadow-sm`}
                        >
                            {/* Day Header - Ultra Compact */}
                            <div className="bg-slate-50 px-1.5 py-0.5 flex justify-between items-center border-b border-slate-100">
                                <span className="text-[8px] font-black text-slate-700 tracking-wider">
                                    {SHORT_DAYS[day]}
                                </span>
                                {slots.length > 0 && <span className="text-[7px] font-bold text-slate-400">{slots.length}</span>}
                            </div>

                            {/* Dense Lesson List */}
                            <div className="p-0.5 min-h-[30px] flex-1">
                                {slots.length === 0 ? (
                                    <div className="h-full w-full flex items-center justify-center py-1">
                                        <span className="text-[8px] text-slate-200 font-medium italic">-</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-px">
                                        {slots.map((slot, i) => {
                                            const student = state.students[slot.studentId!];
                                            const isMakeup = slot.label === 'MAKEUP';
                                            return (
                                                <div key={slot.id} className={`flex items-center gap-1 px-1 py-0.5 rounded-[2px] ${isMakeup ? 'bg-orange-50' : (i % 2 === 0 ? 'bg-slate-50' : 'bg-white')}`}>
                                                    <span className={`text-[6px] font-black shrink-0 tracking-tighter w-auto ${isMakeup ? 'text-orange-600' : 'text-slate-400'}`}>
                                                        {slot.start}-{slot.end}
                                                    </span>
                                                    <span className={`text-[8px] font-bold truncate leading-tight flex-1 ${isMakeup ? 'text-orange-900' : 'text-slate-800'}`}>
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
            <div className="mt-4 text-center opacity-20">
                 <span className="text-[7px] font-bold uppercase tracking-widest">Kurs Yönetim Pro</span>
            </div>
        </div>
    </div>
  );
};
