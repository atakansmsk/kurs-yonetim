
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { Maximize2, X, Star, RefreshCcw, Layers, CalendarCheck } from 'lucide-react';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

const WORK_START = "09:00";
const WORK_END = "22:00";

export const WeeklySummary: React.FC = () => {
  const { state } = useCourse();
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // Stats Calculation
  let totalRegular = 0;
  let totalMakeup = 0;
  let totalTrial = 0;

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

  const totalLessons = totalRegular + totalMakeup + totalTrial;

  // Current Day Detection
  const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon
  const jsDayToAppKey: Record<number, WeekDay> = {
      1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar"
  };
  const currentDayName = jsDayToAppKey[todayIndex];

  const getFullDaySchedule = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      const lessons = (state.schedule[key] || [])
          .filter(s => s.studentId)
          .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

      const blocks: { type: 'LESSON' | 'EMPTY', start: string, end: string, data?: any }[] = [];
      let currentPointer = timeToMinutes(WORK_START);
      const endOfDay = timeToMinutes(WORK_END);

      lessons.forEach(lesson => {
          const lStart = timeToMinutes(lesson.start);
          const lEnd = timeToMinutes(lesson.end);

          if (lStart > currentPointer) {
              blocks.push({ type: 'EMPTY', start: minutesToTime(currentPointer), end: minutesToTime(lStart) });
          }

          blocks.push({ type: 'LESSON', start: lesson.start, end: lesson.end, data: lesson });
          currentPointer = Math.max(currentPointer, lEnd);
      });

      if (currentPointer < endOfDay) {
          blocks.push({ type: 'EMPTY', start: minutesToTime(currentPointer), end: WORK_END });
      }

      return blocks;
  };

  return (
    <div className={`flex flex-col h-full bg-white ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden bg-white' : 'overflow-y-auto no-scrollbar'}`}>
        {/* Header */}
        <div className={`flex flex-col border-b border-slate-100 bg-white ${isScreenshotMode ? 'px-4 py-2' : 'px-6 py-4 sticky top-0 z-10 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                        <CalendarCheck size={20} />
                    </div>
                    <div>
                        <span className={`font-bold text-slate-400 tracking-widest uppercase block ${isScreenshotMode ? 'text-[8px]' : 'text-[10px]'}`}>HAFTALIK PLAN</span>
                        <h2 className={`font-black text-slate-800 leading-none tracking-tight ${isScreenshotMode ? 'text-lg' : 'text-xl'}`}>{state.currentTeacher}</h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {!isScreenshotMode ? (
                        <button 
                            onClick={() => setIsScreenshotMode(true)}
                            className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                            title="Tam Ekran"
                        >
                            <Maximize2 size={20} />
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsScreenshotMode(false)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors print:hidden"
                            title="Kapat"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Badges */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold uppercase">TOPLAM</span>
                    <span className="text-sm font-black bg-white px-1.5 rounded-md shadow-sm">{totalLessons}</span>
                </div>
                {totalTrial > 0 && (
                    <div className="bg-purple-50 text-purple-600 px-2 py-1 rounded-lg flex items-center gap-1.5 shrink-0 border border-purple-100">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[10px] font-bold">DENEME:</span>
                        <span className="text-sm font-black">{totalTrial}</span>
                    </div>
                )}
                {totalMakeup > 0 && (
                    <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg flex items-center gap-1.5 shrink-0 border border-orange-100">
                        <RefreshCcw size={10} />
                        <span className="text-[10px] font-bold">TELAFİ:</span>
                        <span className="text-sm font-black">{totalMakeup}</span>
                    </div>
                )}
            </div>
        </div>
        
        {/* Timeline Layout */}
        <div className={`flex-1 flex flex-col ${isScreenshotMode ? 'p-1' : 'p-2 pb-24'}`}>
            <div className="flex-1 flex gap-1">
                {DAYS.map((day) => {
                    const blocks = getFullDaySchedule(day);
                    const isToday = day === currentDayName;
                    
                    return (
                        <div key={day} className={`flex-1 flex flex-col min-w-0 rounded-xl ${isToday && !isScreenshotMode ? 'bg-indigo-50/30 ring-1 ring-indigo-100' : ''}`}>
                            {/* Gün Başlığı */}
                            <div className={`text-center font-black mb-1 rounded-lg mx-0.5 mt-0.5 ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-400'} ${isScreenshotMode ? 'text-[7px] py-1' : 'text-[9px] py-1.5'}`}>
                                {SHORT_DAYS[day]}
                            </div>

                            {/* Bloklar */}
                            <div className="flex-1 flex flex-col gap-px px-0.5 pb-1">
                                {blocks.map((block, idx) => {
                                    const startMin = timeToMinutes(block.start);
                                    const endMin = timeToMinutes(block.end);
                                    const duration = endMin - startMin;
                                    
                                    if (block.type === 'EMPTY') {
                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ flexGrow: duration }}
                                                className="w-full flex items-center justify-center min-h-[10px] relative group"
                                            >
                                                {/* Hidden duration on hover/screenshot */}
                                                {duration >= 30 && (
                                                    <span className={`text-[6px] font-bold text-slate-200 rotate-90 whitespace-nowrap select-none ${isScreenshotMode ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        BOŞ {duration}dk
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        const slot = block.data;
                                        const student = state.students[slot.studentId!];
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';

                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ flexGrow: duration }}
                                                className={`w-full flex flex-col justify-center px-1 py-0.5 rounded-[6px] relative overflow-hidden min-h-[30px] border-l-[3px] shadow-sm mb-px transition-transform hover:scale-[1.02] ${
                                                    isMakeup 
                                                        ? 'bg-white border-orange-400 shadow-orange-100' 
                                                    : isTrial 
                                                        ? 'bg-white border-purple-400 shadow-purple-100' 
                                                    : 'bg-white border-indigo-500 shadow-slate-200'
                                                }`}
                                            >
                                                <div className={`flex items-center justify-between opacity-80 mb-px ${isMakeup ? 'text-orange-600' : isTrial ? 'text-purple-600' : 'text-indigo-600'}`}>
                                                    <span className={`font-black leading-none truncate ${isScreenshotMode ? 'text-[5px]' : 'text-[7px]'}`}>
                                                        {block.start}-{block.end}
                                                    </span>
                                                    {isTrial && <Star size={isScreenshotMode ? 5 : 8} fill="currentColor" />}
                                                    {isMakeup && <RefreshCcw size={isScreenshotMode ? 5 : 8} />}
                                                </div>

                                                <div className={`font-bold leading-tight truncate text-slate-800 ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'}`}>
                                                    {student?.name.split(' ')[0]}
                                                    {student?.name.split(' ')[1] ? ` ${student?.name.split(' ')[1].charAt(0)}.` : ''}
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
