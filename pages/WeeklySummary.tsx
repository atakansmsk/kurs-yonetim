
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { Maximize2, X, Star, RefreshCcw, CalendarCheck } from 'lucide-react';

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PAZARTESİ", 
  "Salı": "SALI", 
  "Çarşamba": "ÇARŞAMBA", 
  "Perşembe": "PERŞEMBE", 
  "Cuma": "CUMA", 
  "Cmt": "CUMARTESİ", 
  "Pazar": "PAZAR"
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const WeeklySummary: React.FC = () => {
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

  return (
    <div className={`flex flex-col h-full bg-white ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden' : 'overflow-y-auto'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-red-100 ${isScreenshotMode ? 'p-2' : 'p-5 bg-white sticky top-0 z-20'}`}>
             <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 bg-red-600 text-white flex items-center justify-center rounded-lg ${isScreenshotMode ? 'hidden' : 'flex'}`}>
                     <CalendarCheck size={18} />
                 </div>
                 <div>
                     <span className="text-[8px] sm:text-[10px] font-black text-red-400 tracking-widest uppercase block">HAFTALIK PROGRAM</span>
                     <h2 className="text-sm sm:text-xl font-black text-slate-800 uppercase tracking-tight">{state.currentTeacher}</h2>
                 </div>
             </div>

             <div className="flex items-center gap-2">
                 {/* Stats */}
                 <div className="flex gap-1 sm:gap-2 mr-1">
                     <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">{totalLessons} Ders</span>
                 </div>
                 
                 <button 
                    onClick={() => setIsScreenshotMode(!isScreenshotMode)}
                    className="p-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-lg transition-colors print:hidden"
                 >
                     {isScreenshotMode ? <X size={18} /> : <Maximize2 size={18} />}
                 </button>
             </div>
        </div>

        {/* Grid Layout - Classic Timetable Style */}
        <div className={`flex-1 p-1 sm:p-2 bg-white ${isScreenshotMode ? 'overflow-hidden' : ''}`}>
             <div className="grid grid-cols-7 h-full border-t border-l border-slate-200">
                 {DAYS.map((day) => {
                     const key = `${state.currentTeacher}|${day}`;
                     const lessons = (state.schedule[key] || [])
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                     return (
                         <div key={day} className="flex flex-col border-r border-b border-slate-200 min-w-0">
                             {/* Day Header */}
                             <div className="bg-red-50/50 py-2 sm:py-1.5 text-center border-b border-red-100 flex items-center justify-center h-20 sm:h-auto">
                                 <span className="text-[7px] sm:text-[9px] font-black text-red-600 block leading-tight [writing-mode:vertical-lr] sm:[writing-mode:horizontal-tb] rotate-180 sm:rotate-0 whitespace-nowrap">{SHORT_DAYS[day]}</span>
                             </div>

                             {/* Lessons Container */}
                             <div className="flex-1 p-0.5 space-y-0.5 overflow-hidden">
                                 {lessons.map((slot) => {
                                     const student = state.students[slot.studentId!];
                                     const isMakeup = slot.label === 'MAKEUP';
                                     const isTrial = slot.label === 'TRIAL';

                                     return (
                                         <div key={slot.id} className={`p-0.5 sm:p-1 rounded-[2px] mb-0.5 border-l-[1.5px] ${
                                             isMakeup ? 'bg-orange-50 border-orange-400' 
                                             : isTrial ? 'bg-purple-50 border-purple-400'
                                             : 'bg-red-50 border-red-500'
                                         }`}>
                                             <div className="flex items-center justify-between min-w-0">
                                                <span className={`text-[6px] sm:text-[7px] font-bold ${
                                                    isMakeup ? 'text-orange-900' : isTrial ? 'text-purple-900' : 'text-red-900'
                                                } truncate leading-tight`}>
                                                    {student?.name.split(' ')[0]}
                                                </span>
                                                {isMakeup && <RefreshCcw size={4} className="text-orange-500 shrink-0 ml-0.5" />}
                                                {isTrial && <Star size={4} className="text-purple-500 shrink-0 ml-0.5" />}
                                             </div>
                                             <span className="text-[5px] sm:text-[6px] text-slate-400 font-medium block leading-none mt-0.5">
                                                 {slot.start}-{slot.end}
                                             </span>
                                         </div>
                                     );
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
