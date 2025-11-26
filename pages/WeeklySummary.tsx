
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { Maximize2, X, Star, RefreshCcw, CalendarCheck, Clock } from 'lucide-react';

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

const WORK_START = "09:00";
const WORK_END = "22:00";
const START_MIN = timeToMinutes(WORK_START);
const END_MIN = timeToMinutes(WORK_END);
const TOTAL_MIN = END_MIN - START_MIN;

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

  // Current Day
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

      const blocks: { type: 'LESSON' | 'GAP', start: string, end: string, duration: number, data?: any }[] = [];
      let currentPointer = START_MIN;

      lessons.forEach(lesson => {
          const lStart = timeToMinutes(lesson.start);
          const lEnd = timeToMinutes(lesson.end);

          if (lStart > currentPointer) {
              blocks.push({ type: 'GAP', start: "", end: "", duration: lStart - currentPointer });
          }

          blocks.push({ type: 'LESSON', start: lesson.start, end: lesson.end, duration: lEnd - lStart, data: lesson });
          currentPointer = Math.max(currentPointer, lEnd);
      });

      if (currentPointer < END_MIN) {
          blocks.push({ type: 'GAP', start: "", end: "", duration: END_MIN - currentPointer });
      }

      return blocks;
  };

  // Generate Time Ruler Hours
  const timeRuler = [];
  for(let i=9; i<22; i++) {
      timeRuler.push(i);
  }

  return (
    <div className={`flex flex-col h-full bg-white ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden bg-white' : 'overflow-y-auto no-scrollbar'}`}>
        {/* Header */}
        <div className={`flex flex-col border-b border-slate-100 bg-white ${isScreenshotMode ? 'px-4 py-2' : 'px-6 py-4 sticky top-0 z-20 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                        <CalendarCheck size={16} />
                    </div>
                    <div>
                        <span className={`font-bold text-slate-400 tracking-widest uppercase block ${isScreenshotMode ? 'text-[8px]' : 'text-[10px]'}`}>HAFTALIK ÖZET</span>
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

            {/* Stats Badges - Minimal */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    <span className="text-[10px] font-bold text-slate-600">{totalLessons} Ders</span>
                </div>
                {totalTrial > 0 && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-[10px] font-bold text-slate-600">{totalTrial} Deneme</span>
                    </div>
                )}
                {totalMakeup > 0 && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-[10px] font-bold text-slate-600">{totalMakeup} Telafi</span>
                    </div>
                )}
            </div>
        </div>
        
        <div className={`flex-1 flex relative ${isScreenshotMode ? 'p-1' : 'p-2'}`}>
            
            {/* 1. Time Ruler Column */}
            <div className="w-8 flex flex-col pt-6 mr-1 shrink-0 select-none">
                {timeRuler.map(hour => (
                    <div key={hour} style={{ flexGrow: 60 }} className="relative border-r border-slate-100">
                        <span className="absolute -top-2 right-1.5 text-[8px] font-bold text-slate-300">{hour}</span>
                        <div className="absolute top-0 right-0 w-1 h-px bg-slate-200"></div>
                    </div>
                ))}
                {/* Last tick for 22:00 */}
                <div className="relative h-0">
                    <span className="absolute -top-2 right-1.5 text-[8px] font-bold text-slate-300">22</span>
                </div>
            </div>

            {/* 2. Days Columns */}
            <div className="flex-1 flex gap-1">
                {DAYS.map((day) => {
                    const blocks = getFullDaySchedule(day);
                    const isToday = day === currentDayName;
                    
                    return (
                        <div key={day} className={`flex-1 flex flex-col min-w-0 rounded-2xl overflow-hidden ${isToday && !isScreenshotMode ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'bg-transparent'}`}>
                            
                            {/* Header */}
                            <div className={`text-center py-1.5 mb-1 flex flex-col items-center justify-center shrink-0 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                                <span className={`font-black ${isScreenshotMode ? 'text-[7px]' : 'text-[9px]'}`}>{SHORT_DAYS[day]}</span>
                                {isToday && <div className="w-1 h-1 rounded-full bg-blue-500 mt-0.5"></div>}
                            </div>

                            {/* Timeline Track */}
                            <div className="flex-1 flex flex-col w-full relative">
                                {/* Grid lines background (Optional, kept clean for now) */}
                                
                                {blocks.map((block, idx) => {
                                    if (block.type === 'GAP') {
                                        return <div key={idx} style={{ flexGrow: block.duration }} className="w-full"></div>;
                                    } else {
                                        const slot = block.data;
                                        const student = state.students[slot.studentId!];
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';

                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ flexGrow: block.duration }}
                                                className="w-full px-0.5 py-px"
                                            >
                                                <div className={`w-full h-full rounded-lg shadow-sm flex flex-col justify-center px-1 relative overflow-hidden transition-all hover:scale-[1.05] hover:z-10 cursor-default ${
                                                    isMakeup 
                                                        ? 'bg-orange-50 text-orange-800' 
                                                    : isTrial 
                                                        ? 'bg-purple-50 text-purple-800' 
                                                    : 'bg-indigo-50 text-indigo-800'
                                                }`}>
                                                    {/* Color Bar */}
                                                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                                                        isMakeup ? 'bg-orange-400' : isTrial ? 'bg-purple-400' : 'bg-indigo-400'
                                                    }`}></div>

                                                    <div className={`font-bold leading-none truncate pl-1 ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'}`}>
                                                        {student?.name.split(' ')[0]}
                                                        {student?.name.split(' ')[1] ? ` ${student?.name.split(' ')[1].charAt(0)}.` : ''}
                                                    </div>
                                                    
                                                    <div className={`text-[6px] font-medium opacity-70 leading-none mt-0.5 pl-1 truncate ${isScreenshotMode ? 'hidden' : 'block'}`}>
                                                        {block.start}-{block.end}
                                                    </div>

                                                    {/* Icons */}
                                                    {isTrial && <div className="absolute top-0.5 right-0.5"><Star size={6} className="text-purple-400" fill="currentColor"/></div>}
                                                    {isMakeup && <div className="absolute top-0.5 right-0.5"><RefreshCcw size={6} className="text-orange-400"/></div>}
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
