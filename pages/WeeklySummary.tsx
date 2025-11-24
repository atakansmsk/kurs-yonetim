
import React from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, LessonSlot, WeekDay } from '../types';
import { CheckCircle2, CalendarRange, Clock } from 'lucide-react';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Gün isimlerini kısalt
const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "Pazartesi", 
  "Salı": "Salı", 
  "Çarşamba": "Çarşamba", 
  "Perşembe": "Perşembe", 
  "Cuma": "Cuma", 
  "Cmt": "Cumartesi", 
  "Pazar": "Pazar"
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
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-3 pt-6 pb-24">
        
        {/* Screenshot Header */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex items-center justify-between">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">HAFTALIK PROGRAM</p>
                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{state.currentTeacher}</h2>
            </div>
            <div className="flex flex-col items-end">
                <div className="text-2xl font-black text-indigo-600 leading-none">{totalLessons}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">Toplam Ders</div>
            </div>
        </div>
        
        {/* Compact Grid Layout */}
        <div className="grid grid-cols-2 gap-2 pb-4">
            {DAYS.map((day, index) => {
                const key = `${state.currentTeacher}|${day}`;
                const rawSlots = state.schedule[key] || [];
                // Sadece dolu dersleri al ve sırala
                const slots = rawSlots
                    .filter(s => s.studentId)
                    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                const isWeekend = day === "Cmt" || day === "Pazar";

                return (
                    <div 
                        key={day} 
                        className={`rounded-xl border flex flex-col overflow-hidden transition-all ${
                            slots.length > 0 ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-60'
                        } ${index === DAYS.length - 1 && DAYS.length % 2 !== 0 ? 'col-span-2' : ''}`} // Son gün tek kalırsa tam genişlik yap
                    >
                        {/* Day Header */}
                        <div className={`px-3 py-2 border-b flex justify-between items-center ${slots.length > 0 ? 'bg-slate-50 border-slate-100' : 'border-transparent'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isWeekend ? 'text-indigo-400' : 'text-slate-500'}`}>
                                {SHORT_DAYS[day]}
                            </span>
                            {slots.length > 0 && (
                                <span className="bg-white text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                                    {slots.length}
                                </span>
                            )}
                        </div>

                        {/* Lessons List */}
                        <div className="p-1.5 flex flex-col gap-1 flex-1 min-h-[60px]">
                            {slots.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-300 mb-1"></div>
                                    <span className="text-[9px] font-bold">Boş</span>
                                </div>
                            ) : (
                                slots.map(slot => {
                                    const student = state.students[slot.studentId!];
                                    const isMakeup = slot.label === 'MAKEUP';
                                    
                                    return (
                                        <div key={slot.id} className={`flex items-center gap-2 p-1.5 rounded-lg border ${isMakeup ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                                            <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${isMakeup ? 'bg-white text-orange-600 border border-orange-100' : 'bg-slate-100 text-slate-600'}`}>
                                                {slot.start}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-[10px] font-bold truncate leading-tight ${isMakeup ? 'text-orange-900' : 'text-slate-800'}`}>
                                                    {student?.name}
                                                </div>
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
        
        <div className="text-center mt-2 opacity-30">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-900">Kurs Yönetim Pro</p>
        </div>
    </div>
  );
};
