
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
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
            <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
                <span className="text-[9px] font-medium text-slate-400">Haftalık Program</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                <span className="text-xs font-black text-slate-800">{totalLessons}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Ders</span>
            </div>
        </div>
        
        {/* Screenshot Optimized Grid */}
        <div className="p-1 pb-20">
            <div className="grid grid-cols-2 gap-1.5">
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    // Hide empty days optionally? No, user needs to see the full week structure usually.
                    // But to save space, if weekend is empty, maybe make it smaller? 
                    // For now, consistent grid is better for "paper" feel.
                    
                    const isLastItem = index === DAYS.length - 1; // Sunday usually alone at bottom in 2-col layout

                    return (
                        <div 
                            key={day} 
                            className={`flex flex-col border border-slate-200 rounded-md overflow-hidden bg-white ${isLastItem ? 'col-span-2' : ''}`}
                        >
                            {/* Day Header */}
                            <div className="bg-slate-50 px-2 py-1 flex justify-between items-center border-b border-slate-100">
                                <span className="text-[9px] font-black text-slate-700 tracking-wider">
                                    {SHORT_DAYS[day]}
                                </span>
                                {slots.length > 0 && <span className="text-[8px] font-bold text-slate-400">{slots.length}</span>}
                            </div>

                            {/* Dense Lesson List */}
                            <div className="p-0.5 min-h-[40px]">
                                {slots.length === 0 ? (
                                    <div className="h-full flex items-center justify-center py-2">
                                        <span className="text-[8px] text-slate-300 font-medium italic">- Boş -</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-px">
                                        {slots.map((slot, i) => {
                                            const student = state.students[slot.studentId!];
                                            const isMakeup = slot.label === 'MAKEUP';
                                            return (
                                                <div key={slot.id} className={`flex items-center gap-1.5 px-1 py-0.5 rounded-[2px] ${isMakeup ? 'bg-orange-50' : (i % 2 === 0 ? 'bg-slate-50' : 'bg-white')}`}>
                                                    <span className={`text-[8px] font-bold w-6 shrink-0 text-right ${isMakeup ? 'text-orange-600' : 'text-slate-500'}`}>
                                                        {slot.start}
                                                    </span>
                                                    <div className="w-px h-2 bg-slate-200"></div>
                                                    <span className={`text-[9px] font-bold truncate leading-none flex-1 ${isMakeup ? 'text-orange-900' : 'text-slate-800'}`}>
                                                        {student?.name}
                                                    </span>
                                                    {isMakeup && <span className="text-[6px] font-bold text-white bg-orange-400 px-1 rounded-[1px]">T</span>}
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
            <div className="mt-2 text-center opacity-30">
                 <span className="text-[7px] font-bold uppercase tracking-widest">Kurs Yönetim Pro • {new Date().toLocaleDateString('tr-TR')}</span>
            </div>
        </div>
    </div>
  );
};
