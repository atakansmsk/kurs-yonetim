import React, { useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarCheck, Star, RefreshCcw } from 'lucide-react';

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

  // 1. Calculate Stats & Global Start Time
  const { stats, minStartMin } = useMemo(() => {
    let totalRegular = 0, totalMakeup = 0, totalTrial = 0;
    let minMin = 24 * 60; // Initialize high
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
                if (startM < minMin) minMin = startM;
            }
        });
    });
    
    // If no lessons, default to 09:00 (540 mins)
    if (!hasLessons) minMin = 9 * 60;

    return {
        stats: { totalRegular, totalMakeup, totalTrial, total: totalRegular + totalMakeup + totalTrial },
        minStartMin: minMin
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
      let currentPointer = minStartMin; // Start exactly from the earliest lesson of the week

      lessons.forEach((lesson, idx) => {
          const lStart = timeToMinutes(lesson.start);
          const lEnd = timeToMinutes(lesson.end);

          // Render Gap (Invisible or Visible Spacer)
          if (lStart > currentPointer) {
              const diff = lStart - currentPointer;
              // If gap is large (>= 40 mins), show spacing but NO LABEL as per request
              // If it's the first gap (before first lesson of day), we just render empty space, no text.
              
              // We render a flexible height div. 1 min ~= 1.5px (just an estimation for flex)
              // Actually, flex-grow is better. But here we just stack them.
              
              // To represent time visually, we can add a spacer.
              // If the user wants a true timeline, gaps should be proportional.
              // Let's add a spacer block.
              
              if (diff >= 20) {
                 blocks.push(
                     <div key={`gap-${idx}`} style={{ height: `${diff * 1.2}px` }} className="w-full flex items-center justify-center my-0.5 relative group">
                        {/* Only show 'Mola' if it is strictly BETWEEN lessons, not before the first one if start times differ */}
                        {/* User said: "15:00 de başlıyosa öncesinde mola yazmasın" -> Handled by starting currentPointer at minStartMin globally */}
                        
                        {/* Visual Guide Line (very subtle) */}
                        <div className="w-px h-full bg-slate-100 group-hover:bg-indigo-100 transition-colors"></div>
                     </div>
                 );
              } else {
                 blocks.push(<div key={`sp-${idx}`} className="h-2"></div>);
              }
          }

          // Render Lesson
          const student = state.students[lesson.studentId!];
          const isMakeup = lesson.label === 'MAKEUP';
          const isTrial = lesson.label === 'TRIAL';

          blocks.push(
            <div 
                key={lesson.id}
                onClick={() => onOpenStudentProfile(lesson.studentId!)}
                className={`w-full mb-1 cursor-pointer active:scale-95 transition-transform`}
            >
                {/* Card */}
                <div className={`w-full rounded-md px-1.5 py-1.5 border-l-[3px] shadow-sm flex flex-col gap-0.5 ${
                    isMakeup 
                        ? 'bg-orange-50 border-orange-400' 
                    : isTrial 
                        ? 'bg-purple-50 border-purple-400' 
                    : 'bg-white border-indigo-500'
                }`}>
                    <div className="flex justify-between items-start">
                        <div className={`font-bold leading-tight truncate text-[8px] ${
                            isMakeup ? 'text-orange-900' : isTrial ? 'text-purple-900' : 'text-slate-900'
                        }`}>
                            {student?.name.split(' ')[0]} {student?.name.split(' ')[1]?.charAt(0)}.
                        </div>
                        {isTrial && <Star size={8} className="text-purple-500" fill="currentColor"/>}
                        {isMakeup && <RefreshCcw size={8} className="text-orange-500"/>}
                    </div>
                    
                    {/* Time Range */}
                    <div className={`text-[7px] font-bold opacity-80 ${
                         isMakeup ? 'text-orange-700' : isTrial ? 'text-purple-700' : 'text-indigo-600'
                    }`}>
                        {lesson.start} - {lesson.end}
                    </div>
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
        <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                    <CalendarCheck size={16} />
                 </div>
                 <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
            </div>
            
            {/* Stats Badges */}
            <div className="flex gap-1.5">
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md border border-indigo-100">
                    {stats.total} Ders
                </span>
                {stats.totalTrial > 0 && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold rounded-md border border-purple-100">{stats.totalTrial} Deneme</span>}
            </div>
        </div>

        {/* 7-Column Grid Layout */}
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
            <div className="grid grid-cols-7 gap-1 h-full min-h-[500px]">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const blocks = getDayData(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-lg ${isToday ? 'bg-white ring-1 ring-indigo-200 shadow-sm z-10' : 'bg-transparent'}`}>
                            {/* Day Header */}
                            <div className={`text-center py-2 shrink-0 border-b border-slate-100/50 mb-1 ${isToday ? 'bg-indigo-50 rounded-t-lg' : ''}`}>
                                <span className={`block text-[8px] font-black uppercase tracking-wider ${isToday ? 'text-indigo-700' : 'text-slate-400'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-1 px-0.5 pb-2 flex flex-col">
                                {blocks.length > 0 ? blocks : (
                                    <div className="flex-1 w-full flex flex-col items-center justify-start pt-4 opacity-10">
                                        <div className="w-px h-full border-l border-dashed border-slate-400"></div>
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