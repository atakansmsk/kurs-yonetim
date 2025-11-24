
import React from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PAZARTESİ", 
  "Salı": "SALI", 
  "Çarşamba": "ÇARŞAMBA", 
  "Perşembe": "PERŞEMBE", 
  "Cuma": "CUMA", 
  "Cmt": "CUMARTESİ", 
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
    <div className="flex flex-col h-full bg-white overflow-y-auto">
        
        {/* Compact Header for Screenshot context */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-end justify-between bg-slate-50 sticky top-0 z-10">
            <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{state.currentTeacher}</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Haftalık Ders Programı</p>
            </div>
            <div className="text-right bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                <span className="text-lg font-black text-indigo-600 leading-none">{totalLessons}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Ders</span>
            </div>
        </div>
        
        {/* Ultra Dense Grid Layout */}
        <div className="p-2 pb-24">
            <div className="grid grid-cols-2 gap-2">
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    const isWeekend = day === "Cmt" || day === "Pazar";
                    // Son gün tek kalırsa tam genişlik yap (7 gün olduğu için Pazar tek kalır)
                    const isLastItem = index === DAYS.length - 1;

                    return (
                        <div 
                            key={day} 
                            className={`rounded-lg border border-slate-200 flex flex-col bg-white overflow-hidden ${isLastItem ? 'col-span-2' : ''}`}
                        >
                            {/* Day Header */}
                            <div className={`px-2 py-1.5 border-b border-slate-100 flex justify-between items-center ${isWeekend ? 'bg-indigo-50/50' : 'bg-slate-50'}`}>
                                <span className={`text-[9px] font-black tracking-wider ${isWeekend ? 'text-indigo-600' : 'text-slate-600'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                                {slots.length > 0 && (
                                    <span className="text-[9px] font-bold text-slate-400">
                                        {slots.length}
                                    </span>
                                )}
                            </div>

                            {/* Dense List */}
                            <div className="flex-1 min-h-[50px] p-1">
                                {slots.length === 0 ? (
                                    <div className="h-full flex items-center justify-center py-2 opacity-30">
                                        <span className="text-[9px] font-bold text-slate-400 italic">- Boş -</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-0.5">
                                        {slots.map((slot, i) => {
                                            const student = state.students[slot.studentId!];
                                            const isMakeup = slot.label === 'MAKEUP';
                                            
                                            return (
                                                <div key={slot.id} className={`flex items-baseline gap-2 px-1.5 py-1 rounded-[4px] ${i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} ${isMakeup ? 'bg-orange-50/50' : ''}`}>
                                                    <span className={`text-[9px] font-bold shrink-0 w-7 ${isMakeup ? 'text-orange-600' : 'text-slate-500'}`}>
                                                        {slot.start}
                                                    </span>
                                                    <span className={`text-[10px] font-bold truncate leading-none ${isMakeup ? 'text-orange-900' : 'text-slate-800'}`}>
                                                        {student?.name}
                                                    </span>
                                                    {isMakeup && <span className="text-[7px] font-bold text-orange-500 ml-auto">T</span>}
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

            {/* Watermark */}
            <div className="flex justify-center mt-3 opacity-20">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Kurs Yönetim Pro</span>
            </div>
        </div>
    </div>
  );
};
