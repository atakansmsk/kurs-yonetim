
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarRange, Maximize2, X, Minimize2 } from 'lucide-react';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const FULL_DAYS: Record<WeekDay, string> = {
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
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // Tüm haftanın ders sayısını hesapla
  const totalLessons = DAYS.reduce((acc, day) => {
    const key = `${state.currentTeacher}|${day}`;
    const count = (state.schedule[key] || []).filter(s => s.studentId).length;
    return acc + count;
  }, 0);

  return (
    <div className={`flex flex-col h-full bg-white overflow-y-auto no-scrollbar ${isScreenshotMode ? 'fixed inset-0 z-50' : ''}`}>
        {/* Header */}
        <div className={`px-6 py-5 bg-white border-b border-slate-50 flex items-end justify-between ${isScreenshotMode ? 'pt-8' : 'sticky top-0 z-10'}`}>
            <div>
                <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase mb-1 block">EĞİTMEN</span>
                <h2 className={`font-black text-slate-900 leading-none tracking-tight ${isScreenshotMode ? 'text-3xl' : 'text-xl'}`}>{state.currentTeacher}</h2>
            </div>
            <div className="flex flex-col items-end gap-2">
                {!isScreenshotMode ? (
                    <button 
                        onClick={() => setIsScreenshotMode(true)}
                        className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                        title="Ekran Görüntüsü Modu"
                    >
                        <Maximize2 size={20} />
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsScreenshotMode(false)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors print:hidden"
                        title="Kapat"
                    >
                        <X size={24} />
                    </button>
                )}
                <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-2xl font-black text-slate-900 leading-none">{totalLessons}</span>
                        <CalendarRange size={18} className="text-slate-300" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">TOPLAM DERS</span>
                </div>
            </div>
        </div>
        
        {/* Grid Layout */}
        <div className={`bg-white ${isScreenshotMode ? 'p-2' : 'p-4 pb-24'}`}>
            {/* 
                Normal Mod: 2 Sütun (Mobil uyumlu)
                Screenshot Mod: 3 Sütun (Daha kompakt, tek ekran)
            */}
            <div className={`grid gap-3 ${isScreenshotMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    // Pazar günü ayarı
                    // Screenshot modunda Pazar (index 6) en alta 3 sütun genişliğinde yayılır
                    // Normal modda 2 sütun genişliğinde
                    let colSpan = 'col-span-1';
                    if (index === 6) { // Pazar
                        colSpan = isScreenshotMode ? 'col-span-3' : 'col-span-2';
                    }

                    // Ders yoksa gösterme (veya soluk göster)
                    const isEmpty = slots.length === 0;

                    return (
                        <div 
                            key={day} 
                            className={`${colSpan} flex flex-col rounded-2xl transition-all ${isEmpty ? 'bg-slate-50/30 border border-dashed border-slate-100 p-2 opacity-60' : 'bg-slate-50 border border-slate-100 p-2.5'}`}
                        >
                            {/* Day Header */}
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className={`font-black tracking-tight ${isScreenshotMode ? 'text-[9px]' : 'text-[10px]'} ${isEmpty ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {FULL_DAYS[day]}
                                </span>
                                {!isEmpty && (
                                    <span className="bg-white text-slate-800 text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm border border-slate-100">
                                        {slots.length}
                                    </span>
                                )}
                            </div>

                            {/* Lesson List */}
                            <div className="flex flex-col gap-1.5 h-full">
                                {isEmpty ? (
                                    <div className="flex-1 flex items-center justify-center py-1">
                                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest opacity-50">-</span>
                                    </div>
                                ) : (
                                    slots.map((slot) => {
                                        const student = state.students[slot.studentId!];
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';

                                        return (
                                            <div key={slot.id} className="relative bg-white p-1.5 rounded-lg shadow-sm border border-slate-100/50 flex flex-col gap-0.5 overflow-hidden">
                                                {/* Left Color Strip */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                                                    isMakeup ? 'bg-orange-400' : 
                                                    isTrial ? 'bg-purple-400' : 
                                                    'bg-indigo-500'
                                                }`}></div>

                                                <div className="flex items-center justify-between pl-1.5">
                                                    <span className={`text-[8px] font-black tracking-tighter ${
                                                        isMakeup ? 'text-orange-400' : 
                                                        isTrial ? 'text-purple-400' : 
                                                        'text-indigo-500'
                                                    }`}>
                                                        {slot.start}-{slot.end}
                                                    </span>
                                                    
                                                    {isMakeup && <span className="text-[6px] font-bold text-orange-500 bg-orange-50 px-1 rounded">T</span>}
                                                    {isTrial && <span className="text-[6px] font-bold text-purple-500 bg-purple-50 px-1 rounded">D</span>}
                                                </div>
                                                
                                                <span className={`pl-1.5 font-bold text-slate-700 truncate leading-tight ${isScreenshotMode ? 'text-[9px]' : 'text-[10px]'}`}>
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
            <div className="mt-6 mb-2 text-center">
                 <div className="inline-flex items-center gap-1.5 opacity-20 grayscale">
                    <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-900">KURS YÖNETİM PRO</span>
                 </div>
            </div>
        </div>
    </div>
  );
};
