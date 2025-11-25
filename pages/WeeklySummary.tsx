
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
  "Pazar": "PAZAR"
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
        
        {/* Screenshot Optimized 3-Column Grid */}
        <div className="p-1 pb-20">
            <div className="grid grid-cols-3 gap-1">
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    // Sunday is the last item (index 6), make it span full width
                    const isSunday = index === 6; 

                    return (
                        <div 
                            key={day} 
                            className={`${isSunday ? 'col-span-3 flex flex-row items-stretch' : 'flex flex-col'} border border-slate-200 rounded-[4px] overflow-hidden bg-white`}
                        >
                            {/* Day Header */}
                            <div className={`bg-slate-50 px-1.5 py-0.5 flex justify-between items-center border-b border-slate-100 ${isSunday ? 'w-16 flex-col justify-center border-r border-b-0 shrink-0' : ''}`}>
                                <span className="text-[8px] font-black text-slate-700 tracking-wider">
                                    {SHORT_DAYS[day]}
                                </span>
                                {slots.length > 0 && <span className="text-[7px] font-bold text-slate-400">{slots.length}</span>}
                            </div>

                            {/* Dense Lesson List */}
                            <div className={`p-0.5 min-h-[30px] flex-1 ${isSunday ? 'flex flex-wrap gap-1 p-1 items-center' : ''}`}>
                                {slots.length === 0 ? (
                                    <div className="h-full w-full flex items-center justify-center py-1">
                                        <span className="text-[7px] text-slate-300 font-medium italic">-</span>
                                    </div>
                                ) : (
                                    <div className={`flex ${isSunday ? 'flex-row flex-wrap gap-2' : 'flex-col gap-px'}`}>
                                        {slots.map((slot, i) => {
                                            const student = state.students[slot.studentId!];
                                            const isMakeup = slot.label === 'MAKEUP';
                                            return (
                                                <div key={slot.id} className={`flex items-center gap-1 px-1 py-px rounded-[2px] ${isMakeup ? 'bg-orange-50' : (i % 2 === 0 ? 'bg-slate-50' : 'bg-white')} ${isSunday ? 'border border-slate-100 pr-2' : ''}`}>
                                                    <span className={`text-[6.5px] font-bold shrink-0 text-right tracking-tight ${isMakeup ? 'text-orange-600' : 'text-slate-500'}`}>
                                                        {slot.start}-{slot.end}
                                                    </span>
                                                    {!isSunday && <div className="w-px h-1.5 bg-slate-200"></div>}
                                                    <span className={`text-[8px] font-bold truncate leading-none flex-1 max-w-[70px] ${isMakeup ? 'text-orange-900' : 'text-slate-800'}`}>
                                                        {student?.name}
                                                    </span>
                                                    {isMakeup && <span className="text-[5px] font-bold text-white bg-orange-400 px-0.5 rounded-[1px]">T</span>}
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
            <div className="mt-1 text-center opacity-20">
                 <span className="text-[6px] font-bold uppercase tracking-widest">Kurs Yönetim Pro</span>
            </div>
        </div>
    </div>
  );
};
