
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarRange, Maximize2, X, Minimize2, Share } from 'lucide-react';

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
    <div className={`flex flex-col h-full bg-white ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden' : 'overflow-y-auto no-scrollbar'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-slate-100 bg-white ${isScreenshotMode ? 'px-3 py-2 h-12 shadow-sm' : 'px-6 py-5 sticky top-0 z-10'}`}>
            <div>
                <span className={`font-bold text-indigo-500 tracking-widest uppercase block ${isScreenshotMode ? 'text-[8px] mb-0' : 'text-[10px] mb-1'}`}>PROGRAM</span>
                <h2 className={`font-black text-slate-900 leading-none tracking-tight ${isScreenshotMode ? 'text-sm' : 'text-xl'}`}>{state.currentTeacher}</h2>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Total Counter (Small in screenshot mode) */}
                <div className={`text-right ${isScreenshotMode ? 'mr-2' : ''}`}>
                    <div className="flex items-center gap-1 justify-end">
                        <span className={`font-black text-slate-900 leading-none ${isScreenshotMode ? 'text-sm' : 'text-2xl'}`}>{totalLessons}</span>
                        {!isScreenshotMode && <CalendarRange size={18} className="text-slate-300" />}
                    </div>
                    {!isScreenshotMode && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">TOPLAM</span>}
                </div>

                {!isScreenshotMode ? (
                    <button 
                        onClick={() => setIsScreenshotMode(true)}
                        className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                        title="Tam Ekran / Yazdır"
                    >
                        <Maximize2 size={20} />
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsScreenshotMode(false)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors print:hidden"
                        title="Kapat"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
        
        {/* Grid Layout */}
        <div className={`bg-white ${isScreenshotMode ? 'flex-1 p-1 overflow-hidden flex flex-col' : 'p-4 pb-24'}`}>
            {/* 
                Screenshot Mode: 
                - Force 3 columns
                - Rows determined by flex-1 to fill screen
                - Sunday spans full bottom
            */}
            <div className={`grid gap-2 ${isScreenshotMode ? 'gap-1 h-full grid-cols-3 grid-rows-3' : 'grid-cols-2 gap-3'}`}>
                {DAYS.map((day, index) => {
                    const key = `${state.currentTeacher}|${day}`;
                    const rawSlots = state.schedule[key] || [];
                    const slots = rawSlots
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                    // Layout Logic
                    // Index 0,1,2 (Mon,Tue,Wed) -> Row 1
                    // Index 3,4,5 (Thu,Fri,Sat) -> Row 2
                    // Index 6 (Sun) -> Row 3 (Col Span 3)
                    
                    let className = "flex flex-col rounded-lg border";
                    if (isScreenshotMode) {
                        className += " border-slate-200 bg-white overflow-hidden"; // Daha temiz beyaz
                        if (index === 6) className += " col-span-3 flex-row gap-4 items-start px-2"; // Pazar yatay
                    } else {
                        className += " bg-slate-50 border-slate-100 p-2 min-h-[120px]";
                        if (index === 6) className += " col-span-2"; // Pazar normal modda 2 sütun
                    }

                    // Pazar Günü Özel Stili (Screenshot Modu)
                    const isSundayScreenshot = isScreenshotMode && index === 6;

                    // Ders yoksa
                    const isEmpty = slots.length === 0;

                    return (
                        <div key={day} className={className}>
                            {/* Day Header */}
                            <div className={`${isSundayScreenshot ? 'w-24 shrink-0 border-r border-slate-100 py-2' : 'flex justify-between items-center mb-1 px-1 py-0.5 bg-slate-50/50'}`}>
                                <span className={`font-black tracking-tight text-slate-600 uppercase ${isScreenshotMode ? 'text-[8px]' : 'text-[10px]'} ${isEmpty && !isScreenshotMode ? 'opacity-50' : ''}`}>
                                    {FULL_DAYS[day]}
                                </span>
                                {!isSundayScreenshot && !isEmpty && (
                                    <span className={`text-slate-400 font-bold ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'}`}>
                                        ({slots.length})
                                    </span>
                                )}
                            </div>

                            {/* Lesson List */}
                            <div className={`flex flex-col w-full ${isSundayScreenshot ? 'flex-row flex-wrap gap-2 py-2' : 'gap-0.5'}`}>
                                {isEmpty ? (
                                    !isScreenshotMode && (
                                        <div className="flex-1 flex items-center justify-center py-1">
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest opacity-50">-</span>
                                        </div>
                                    )
                                ) : (
                                    slots.map((slot) => {
                                        const student = state.students[slot.studentId!];
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';

                                        return (
                                            <div key={slot.id} className={`relative flex items-center gap-1.5 px-1.5 rounded border border-slate-100 ${isScreenshotMode ? 'py-0.5 min-h-[18px]' : 'py-1 min-h-[26px] bg-white shadow-sm'}`}>
                                                {/* Color Indicator */}
                                                <div className={`w-0.5 rounded-full ${isScreenshotMode ? 'h-2.5' : 'h-3'} ${
                                                    isMakeup ? 'bg-orange-400' : 
                                                    isTrial ? 'bg-purple-400' : 
                                                    'bg-indigo-500'
                                                }`}></div>

                                                {/* Time */}
                                                <span className={`font-black tracking-tighter tabular-nums ${
                                                    isMakeup ? 'text-orange-400' : 
                                                    isTrial ? 'text-purple-400' : 
                                                    'text-indigo-500'
                                                } ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'}`}>
                                                    {slot.start}-{slot.end}
                                                </span>
                                                
                                                {/* Name */}
                                                <span className={`font-bold text-slate-700 truncate leading-none ${isScreenshotMode ? 'text-[7px]' : 'text-[10px]'}`}>
                                                    {student?.name}
                                                </span>

                                                {/* Labels (Small) */}
                                                {(isMakeup || isTrial) && (
                                                    <span className={`ml-auto text-[5px] font-bold px-0.5 rounded ${
                                                        isMakeup ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'
                                                    }`}>
                                                        {isMakeup ? 'T' : 'D'}
                                                    </span>
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

            {/* Footer Watermark (Only visible if space permits or at very bottom) */}
            {isScreenshotMode && (
                <div className="mt-auto pt-1 text-center">
                     <span className="text-[6px] font-bold text-slate-300 uppercase tracking-[0.2em]">KURS YÖNETİM PRO</span>
                </div>
            )}
        </div>
    </div>
  );
};
