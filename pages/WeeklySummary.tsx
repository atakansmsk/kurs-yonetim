
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarRange, Maximize2, X, Download } from 'lucide-react';

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

  const totalLessons = DAYS.reduce((acc, day) => {
    const key = `${state.currentTeacher}|${day}`;
    const count = (state.schedule[key] || []).filter(s => s.studentId).length;
    return acc + count;
  }, 0);

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
        <div className={`flex items-center justify-between border-b border-slate-100 bg-white ${isScreenshotMode ? 'px-4 py-3 h-14' : 'px-6 py-5 sticky top-0 z-10 shadow-sm'}`}>
            <div>
                <span className={`font-bold text-slate-400 tracking-widest uppercase block ${isScreenshotMode ? 'text-[8px] mb-0' : 'text-[10px] mb-1'}`}>PROGRAM</span>
                <h2 className={`font-black text-slate-800 leading-none tracking-tight ${isScreenshotMode ? 'text-sm' : 'text-xl'}`}>{state.currentTeacher}</h2>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 justify-end">
                    <span className={`font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-lg ${isScreenshotMode ? 'text-xs' : 'text-xl'}`}>{totalLessons} Ders</span>
                </div>

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
        
        {/* Timeline Layout */}
        <div className={`flex-1 flex flex-col ${isScreenshotMode ? 'p-2' : 'p-4 pb-24'}`}>
            <div className="flex-1 flex gap-1">
                {DAYS.map((day) => {
                    const blocks = getFullDaySchedule(day);
                    
                    return (
                        <div key={day} className="flex-1 flex flex-col min-w-0">
                            {/* Gün Başlığı */}
                            <div className={`text-center font-black text-slate-500 mb-1 rounded-md bg-slate-50 ${isScreenshotMode ? 'text-[7px] py-1' : 'text-[10px] py-2'}`}>
                                {SHORT_DAYS[day]}
                            </div>

                            {/* Bloklar */}
                            <div className="flex-1 flex flex-col gap-px">
                                {blocks.map((block, idx) => {
                                    const startMin = timeToMinutes(block.start);
                                    const endMin = timeToMinutes(block.end);
                                    const duration = endMin - startMin;
                                    
                                    if (block.type === 'EMPTY') {
                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ flexGrow: duration }}
                                                className="w-full flex items-center justify-center min-h-[5px]"
                                            >
                                                {/* Temiz boşluk */}
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
                                                className={`w-full flex flex-col justify-center px-1 py-0.5 rounded-[4px] relative overflow-hidden min-h-[24px] border-l-[3px] shadow-sm ${
                                                    isMakeup 
                                                        ? 'bg-orange-50 text-orange-800 border-orange-400' 
                                                    : isTrial 
                                                        ? 'bg-purple-50 text-purple-800 border-purple-400' 
                                                    : 'bg-indigo-50 text-indigo-800 border-indigo-500'
                                                }`}
                                            >
                                                <div className={`font-bold leading-none truncate opacity-60 ${isScreenshotMode ? 'text-[5px]' : 'text-[8px]'}`}>
                                                    {block.start}
                                                </div>
                                                <div className={`font-bold leading-tight truncate mt-px ${isScreenshotMode ? 'text-[6px]' : 'text-[9px]'}`}>
                                                    {student?.name.split(' ')[0]}
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
