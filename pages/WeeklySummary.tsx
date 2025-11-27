
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { Maximize2, X, Star, RefreshCcw, CalendarCheck, Coffee, Clock } from 'lucide-react';

interface WeeklySummaryProps {
    onOpenStudentProfile: (id: string) => void;
}

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

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state } = useCourse();
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // Stats
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

  const todayIndex = new Date().getDay(); // 0=Sun
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

      return { blocks, isEmpty: lessons.length === 0 };
  };

  return (
    <div className={`flex flex-col h-full bg-[#F8FAFC] ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden bg-white' : 'overflow-y-auto no-scrollbar'}`}>
        
        {/* Header */}
        <div className={`flex flex-col border-b border-slate-200 bg-white ${isScreenshotMode ? 'px-4 py-3' : 'px-6 py-4 sticky top-0 z-20 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <CalendarCheck size={20} />
                    </div>
                    <div>
                        <span className={`font-bold text-slate-400 tracking-widest uppercase block ${isScreenshotMode ? 'text-[9px]' : 'text-[10px]'}`}>HAFTALIK PROGRAM</span>
                        <h2 className={`font-black text-slate-900 leading-none tracking-tight ${isScreenshotMode ? 'text-xl' : 'text-2xl'}`}>{state.currentTeacher}</h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {!isScreenshotMode ? (
                        <button 
                            onClick={() => setIsScreenshotMode(true)}
                            className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                            title="Tam Ekran / Yazdır"
                        >
                            <Maximize2 size={20} />
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsScreenshotMode(false)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors print:hidden"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Colorful Stats */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold whitespace-nowrap">
                    Top. {totalLessons} Ders
                </div>
                {totalRegular > 0 && (
                     <div className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold whitespace-nowrap flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> {totalRegular} Normal
                    </div>
                )}
                {totalTrial > 0 && (
                     <div className="px-3 py-1 rounded-full bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-700 text-[10px] font-bold whitespace-nowrap flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></div> {totalTrial} Deneme
                    </div>
                )}
                {totalMakeup > 0 && (
                     <div className="px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-bold whitespace-nowrap flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> {totalMakeup} Telafi
                    </div>
                )}
            </div>
        </div>
        
        {/* Main Content */}
        <div className={`flex-1 flex relative ${isScreenshotMode ? 'p-1 bg-white' : 'p-2'}`}>
            
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 40px' }}>
            </div>

            {/* Days Columns */}
            <div className="flex-1 flex gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {DAYS.map((day) => {
                    const { blocks, isEmpty } = getFullDaySchedule(day);
                    const isToday = day === currentDayName;
                    
                    return (
                        <div key={day} className={`flex-1 flex flex-col min-w-0 bg-white relative group`}>
                            
                            {/* Day Header */}
                            <div className={`text-center py-2 border-b border-slate-100 flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-indigo-50/50' : 'bg-white'}`}>
                                <span className={`font-black uppercase tracking-tight ${isToday ? 'text-indigo-600' : 'text-slate-500'} ${isScreenshotMode ? 'text-[8px]' : 'text-[10px]'}`}>
                                    {isScreenshotMode ? SHORT_DAYS[day] : SHORT_DAYS[day]}
                                </span>
                                {isToday && <div className="w-1 h-1 rounded-full bg-indigo-500 mt-0.5"></div>}
                            </div>

                            {/* Timeline Track */}
                            <div className="flex-1 flex flex-col w-full relative">
                                {isEmpty ? (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
                                            {/* Pattern Background for Empty Days */}
                                        </div>
                                    </div>
                                ) : (
                                    blocks.map((block, idx) => {
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
                                                    className="w-full px-0.5 py-px relative z-10"
                                                >
                                                    <div 
                                                        onClick={() => onOpenStudentProfile(slot.studentId!)}
                                                        className={`w-full h-full rounded-md shadow-sm border flex flex-col justify-center px-1.5 relative overflow-hidden transition-all hover:scale-[1.02] hover:z-20 cursor-pointer ${
                                                            isMakeup 
                                                                ? 'bg-orange-100 border-orange-200 text-orange-900' 
                                                            : isTrial 
                                                                ? 'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-900' 
                                                            : 'bg-indigo-100 border-indigo-200 text-indigo-900'
                                                        }`}
                                                    >
                                                        {/* Color Indicator */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                                                            isMakeup ? 'bg-orange-500' : isTrial ? 'bg-fuchsia-500' : 'bg-indigo-500'
                                                        }`}></div>

                                                        <div className={`font-bold leading-tight truncate pl-1.5 ${isScreenshotMode ? 'text-[7px]' : 'text-[9px]'}`}>
                                                            {student?.name.split(' ')[0]}
                                                            {student?.name.split(' ')[1] ? ` ${student?.name.split(' ')[1].charAt(0)}.` : ''}
                                                        </div>
                                                        
                                                        <div className={`font-medium opacity-70 leading-none mt-0.5 pl-1.5 truncate flex items-center gap-0.5 ${isScreenshotMode ? 'text-[6px]' : 'text-[8px]'}`}>
                                                            {/* <Clock size={isScreenshotMode ? 4 : 8} className="opacity-50" /> */}
                                                            {block.start}
                                                        </div>

                                                        {/* Icons */}
                                                        {isTrial && <div className="absolute top-0.5 right-0.5"><Star size={6} className="text-fuchsia-500" fill="currentColor"/></div>}
                                                        {isMakeup && <div className="absolute top-0.5 right-0.5"><RefreshCcw size={6} className="text-orange-500"/></div>}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
