
import React from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarRange, Clock } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-white overflow-y-auto no-scrollbar">
        {/* Premium Header */}
        <div className="px-6 py-5 bg-white sticky top-0 z-10 border-b border-slate-50 flex items-end justify-between">
            <div>
                <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase mb-1 block">EĞİTMEN</span>
                <h2 className="text-xl font-black text-slate-900 leading-none tracking-tight">{state.currentTeacher}</h2>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-2xl font-black text-slate-900 leading-none">{totalLessons}</span>
                    <CalendarRange size={18} className="text-slate-300" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">TOPLAM DERS</span>
            </div>
        </div>
        
        {/* Modern Masonry-like Grid */}
        <div className="p-4 pb-24 bg-white">
            <div className="grid grid-cols-2 gap-4">
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    // Pazar günü (Index 6) tam genişlikte olsun
                    const isSunday = index === 6;
                    const colSpan = isSunday ? 'col-span-2' : 'col-span-1';

                    // Ders yoksa gösterme (veya soluk göster) - Şimdilik boşsa da gösterelim ama minimal
                    const isEmpty = slots.length === 0;

                    return (
                        <div 
                            key={day} 
                            className={`${colSpan} flex flex-col rounded-3xl p-3 transition-all ${isEmpty ? 'bg-slate-50/50 border border-dashed border-slate-100' : 'bg-slate-50 border border-slate-100'}`}
                        >
                            {/* Day Header */}
                            <div className="flex justify-between items-center mb-3 px-1">
                                <span className={`text-[10px] font-black tracking-wider ${isEmpty ? 'text-slate-300' : 'text-slate-400'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                                {!isEmpty && (
                                    <span className="bg-white text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border border-slate-100">
                                        {slots.length}
                                    </span>
                                )}
                            </div>

                            {/* Lesson List */}
                            <div className="flex flex-col gap-2 h-full">
                                {isEmpty ? (
                                    <div className="flex-1 flex items-center justify-center py-2">
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest opacity-50">BOŞ</span>
                                    </div>
                                ) : (
                                    slots.map((slot) => {
                                        const student = state.students[slot.studentId!];
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';

                                        return (
                                            <div key={slot.id} className="relative bg-white p-2 rounded-xl shadow-sm border border-slate-100/50 flex flex-col gap-0.5 overflow-hidden group">
                                                {/* Left Color Strip */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                    isMakeup ? 'bg-orange-400' : 
                                                    isTrial ? 'bg-purple-400' : 
                                                    'bg-indigo-500'
                                                }`}></div>

                                                <div className="flex items-center justify-between pl-2">
                                                    <span className={`text-[9px] font-black tracking-tight ${
                                                        isMakeup ? 'text-orange-400' : 
                                                        isTrial ? 'text-purple-400' : 
                                                        'text-indigo-500'
                                                    }`}>
                                                        {slot.start}-{slot.end}
                                                    </span>
                                                    
                                                    {isMakeup && <span className="text-[6px] font-bold text-orange-500 bg-orange-50 px-1 rounded">TELAFİ</span>}
                                                    {isTrial && <span className="text-[6px] font-bold text-purple-500 bg-purple-50 px-1 rounded">DENEME</span>}
                                                </div>
                                                
                                                <span className="pl-2 text-[10px] font-bold text-slate-700 truncate leading-tight">
                                                    {student?.name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Watermark */}
            <div className="mt-8 mb-4 text-center">
                 <div className="inline-flex items-center gap-1.5 opacity-30 grayscale">
                    <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-900">KURS YÖNETİM PRO</span>
                 </div>
            </div>
        </div>
    </div>
  );
};
