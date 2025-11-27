
import React, { useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarCheck, Star, RefreshCcw, Clock } from 'lucide-react';

interface WeeklySummaryProps {
    onOpenStudentProfile: (id: string) => void;
}

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// SHORT DAYS for Header
const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", 
  "Salı": "SAL", 
  "Çarşamba": "ÇAR", 
  "Perşembe": "PER", 
  "Cuma": "CUM", 
  "Cmt": "CMT", 
  "Pazar": "PAZ"
};

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state } = useCourse();

  // 1. Calculate Stats & Global Range
  const { stats, minStartMin, maxEndMin } = useMemo(() => {
    let totalRegular = 0, totalMakeup = 0, totalTrial = 0;
    let minMin = 9 * 60; // Default earliest 09:00
    let maxMin = 18 * 60; // Default latest 18:00
    let hasLessons = false;

    DAYS.forEach(day => {
        const key = `${state.currentTeacher}|${day}`;
        const lessons = state.schedule[key] || [];
        lessons.forEach(s => {
            if (s.studentId) {
                hasLessons = true;
                if (s.label === 'TRIAL') totalTrial++;
                else if (s.label === 'MAKEUP') totalMakeup++;
                else totalRegular++;
                
                const startM = timeToMinutes(s.start);
                const endM = timeToMinutes(s.end);
                
                if (startM < minMin) minMin = startM;
                if (endM > maxMin) maxMin = endM;
            }
        });
    });
    
    // Add some padding
    if (hasLessons) {
        maxMin = Math.min(23 * 60, maxMin + 30); // 30 min buffer at end
    }

    return {
        stats: { totalRegular, totalMakeup, totalTrial, total: totalRegular + totalMakeup + totalTrial },
        minStartMin: minMin,
        maxEndMin: maxMin
    };
  }, [state.schedule, state.currentTeacher]);

  const todayIndex = new Date().getDay(); // 0=Sun
  const jsDayToAppKey: Record<number, WeekDay> = {
      1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar"
  };
  const currentDayName = jsDayToAppKey[todayIndex];

  // 2. Prepare Data for Each Day
  const getDayData = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      const lessons = (state.schedule[key] || [])
          .filter(s => s.studentId)
          .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

      const blocks: React.ReactNode[] = [];
      let currentPointer = minStartMin;

      lessons.forEach((lesson, idx) => {
          const lStart = timeToMinutes(lesson.start);
          const lEnd = timeToMinutes(lesson.end);

          // Gap Detection (> 40 mins)
          if (lStart - currentPointer >= 40) {
               // Render Gap
               blocks.push(
                   <div key={`gap-${idx}`} className="w-full flex flex-col items-center justify-center my-1 opacity-40">
                       <div className="w-px h-3 bg-slate-300"></div>
                       <span className="text-[7px] text-slate-400 font-medium whitespace-nowrap bg-slate-100 px-1 rounded">{(lStart - currentPointer)}dk Mola</span>
                       <div className="w-px h-3 bg-slate-300"></div>
                   </div>
               );
          } else if (lStart > currentPointer) {
               // Small gap, just spacing
               blocks.push(<div key={`sp-${idx}`} className="h-1"></div>);
          }

          // Render Lesson
          const student = state.students[lesson.studentId!];
          const isMakeup = lesson.label === 'MAKEUP';
          const isTrial = lesson.label === 'TRIAL';

          blocks.push(
            <div 
                key={lesson.id}
                onClick={() => onOpenStudentProfile(lesson.studentId!)}
                className={`w-full mb-1 relative group cursor-pointer active:scale-95 transition-transform`}
            >
                {/* Time Badge */}
                <div className="text-[7px] font-bold text-slate-400 mb-[1px] ml-0.5">{lesson.start}</div>
                
                {/* Card */}
                <div className={`w-full rounded-md px-1.5 py-1.5 border-l-2 shadow-sm ${
                    isMakeup 
                        ? 'bg-orange-50 border-orange-400' 
                    : isTrial 
                        ? 'bg-purple-50 border-purple-400' 
                    : 'bg-white border-indigo-500'
                }`}>
                    <div className={`font-bold leading-tight truncate text-[8px] ${
                        isMakeup ? 'text-orange-900' : isTrial ? 'text-purple-900' : 'text-slate-900'
                    }`}>
                        {student?.name.split(' ')[0]}
                    </div>
                    <div className={`font-medium truncate text-[7px] opacity-70 ${
                         isMakeup ? 'text-orange-800' : isTrial ? 'text-purple-800' : 'text-slate-500'
                    }`}>
                        {student?.name.split(' ')[1] || ''}
                    </div>

                    {/* Icons */}
                    {isTrial && <div className="absolute top-3 right-1"><Star size={6} className="text-purple-500" fill="currentColor"/></div>}
                    {isMakeup && <div className="absolute top-3 right-1"><RefreshCcw size={6} className="text-orange-500"/></div>}
                </div>
            </div>
          );

          currentPointer = lEnd;
      });

      return blocks;
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* Compact Header */}
        <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                    <CalendarCheck size={16} />
                 </div>
                 <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
            </div>
            
            {/* Stats Badges */}
            <div className="flex gap-1.5">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-md border border-slate-200">
                    {stats.total} Ders
                </span>
                {stats.totalTrial > 0 && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-md border border-purple-200">{stats.totalTrial} D</span>}
            </div>
        </div>

        {/* 7-Column Grid Layout */}
        <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-7 gap-1 h-full min-h-[500px]">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const blocks = getDayData(day);
                    const hasBlocks = blocks.length > 0;

                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-lg ${isToday ? 'bg-indigo-50/30 ring-1 ring-indigo-100' : 'bg-transparent'}`}>
                            {/* Day Header */}
                            <div className="text-center py-2 shrink-0 border-b border-slate-100/50 mb-1">
                                <span className={`block text-[8px] font-black uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-1 px-0.5 pb-2 flex flex-col items-center">
                                {hasBlocks ? blocks : (
                                    <div className="flex-1 w-full flex flex-col items-center justify-start pt-10 opacity-20">
                                        {/* Empty state visual */}
                                        <div className="w-px h-full border-l border-dashed border-slate-300"></div>
                                    </div>
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
