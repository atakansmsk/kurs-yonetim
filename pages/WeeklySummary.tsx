
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { Maximize2, X, Star, RefreshCcw, CalendarCheck, Search, Plus, Clock } from 'lucide-react';
import { Dialog } from '../components/Dialog';

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", 
  "Salı": "SAL", 
  "Çarşamba": "ÇAR", 
  "Perşembe": "PER", 
  "Cuma": "CUM", 
  "Cmt": "CMT", 
  "Pazar": "PAZ"
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const DEFAULT_LESSON_DURATION = 40;
const SCAN_START_MINUTES = 15 * 60; // Start finding gaps from 15:00 (3 PM)
const WORK_END_MINUTES = 21 * 60; // End day at 21:00

export const WeeklySummary: React.FC = () => {
  const { state, actions } = useCourse();
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  
  // Gap Finding State
  const [gapDialogDay, setGapDialogDay] = useState<WeekDay | null>(null);
  const [foundGaps, setFoundGaps] = useState<string[]>([]);

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
  const todayName = DAYS[(new Date().getDay() + 6) % 7];

  const handleFindGaps = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      const rawSlots = state.schedule[key] || [];
      const slots = [...rawSlots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

      const gaps: string[] = [];
      let currentPointer = SCAN_START_MINUTES;

      slots.forEach(slot => {
          const slotStart = timeToMinutes(slot.start);
          const slotEnd = timeToMinutes(slot.end);

          if (slotEnd > currentPointer) {
               while (currentPointer + DEFAULT_LESSON_DURATION <= slotStart) {
                  gaps.push(minutesToTime(currentPointer));
                  currentPointer += DEFAULT_LESSON_DURATION; 
               }
               currentPointer = Math.max(currentPointer, slotEnd);
          }
      });

      while (currentPointer + DEFAULT_LESSON_DURATION <= WORK_END_MINUTES) {
          gaps.push(minutesToTime(currentPointer));
          currentPointer += DEFAULT_LESSON_DURATION;
      }

      setFoundGaps(gaps);
      setGapDialogDay(day);
  };

  const handleAddGapSlot = (startTime: string) => {
      if (!gapDialogDay) return;
      const startMins = timeToMinutes(startTime);
      const endTime = minutesToTime(startMins + DEFAULT_LESSON_DURATION);
      actions.addSlot(gapDialogDay, startTime, endTime);
      setGapDialogDay(null); // Close dialog
  };

  return (
    <div className={`flex flex-col h-full bg-[#F8FAFC] ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden bg-white' : 'overflow-y-auto'}`}>
        
        {/* Header - Hidden in Screenshot Mode */}
        {!isScreenshotMode && (
            <div className="flex items-center justify-between p-5 bg-white sticky top-0 z-20 border-b border-slate-100 shadow-sm">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-red-50 text-red-600 flex items-center justify-center rounded-xl shadow-sm">
                         <CalendarCheck size={20} />
                     </div>
                     <div>
                         <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase block">HAFTALIK</span>
                         <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{state.currentTeacher}</h2>
                     </div>
                 </div>

                 <div className="flex items-center gap-2">
                     <div className="flex gap-1 mr-1">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{totalLessons} Ders</span>
                     </div>
                     
                     <button 
                        onClick={() => setIsScreenshotMode(!isScreenshotMode)}
                        className="p-2.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-100 transition-colors shadow-sm"
                        title="Tam Ekran / Yazdır"
                     >
                         <Maximize2 size={18} />
                     </button>
                 </div>
            </div>
        )}

        {/* Timeline Layout */}
        <div className={`flex-1 flex relative ${isScreenshotMode ? 'bg-white p-2' : 'px-1 pb-20'}`}>
             
             {/* Time Ruler (Left Sidebar) */}
             <div className="flex flex-col pt-10 pr-1 gap-[calc(6vh)] sm:gap-16 text-[8px] font-bold text-slate-300 text-right select-none min-w-[24px] border-r border-slate-100/50">
                 <span>09:00</span>
                 <span>12:00</span>
                 <span>15:00</span>
                 <span>18:00</span>
                 <span>21:00</span>
             </div>

             {/* Days Columns */}
             <div className="flex-1 grid grid-cols-7 h-full ml-1">
                 {DAYS.map((day) => {
                     const isToday = day === todayName && !isScreenshotMode;
                     const key = `${state.currentTeacher}|${day}`;
                     const lessons = (state.schedule[key] || [])
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                     return (
                         <div key={day} className={`flex flex-col min-w-0 border-r border-slate-100/50 last:border-0 relative group/col ${isToday ? 'bg-red-50/30' : ''}`}>
                             
                             {/* Header */}
                             <button 
                                onClick={() => handleFindGaps(day)}
                                className={`py-3 text-center mb-1 transition-colors relative group/btn w-full ${isToday ? '' : 'hover:bg-slate-50'}`}
                             >
                                 <span className={`text-[9px] font-black block leading-none break-words px-0.5 ${isToday ? 'text-red-600' : 'text-slate-400 group-hover/btn:text-slate-600'}`}>
                                     {SHORT_DAYS[day]}
                                 </span>
                                 {/* Hover Hint */}
                                 <span className="hidden group-hover/btn:flex absolute top-1 left-1/2 -translate-x-1/2 -translate-y-full bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-30">
                                     Boşluk Bul (15:00+)
                                 </span>
                             </button>

                             {/* Lessons Container */}
                             <div className="flex-1 px-0.5 space-y-1">
                                 {lessons.map((slot) => {
                                     const student = state.students[slot.studentId!];
                                     const isMakeup = slot.label === 'MAKEUP';
                                     const isTrial = slot.label === 'TRIAL';

                                     return (
                                         <div key={slot.id} className={`
                                            relative z-10 p-1 rounded-md border-l-[2px] shadow-sm cursor-default transition-transform hover:scale-[1.05] hover:z-20
                                            ${isMakeup 
                                                ? 'bg-orange-50 border-orange-400 shadow-orange-100' 
                                                : isTrial 
                                                    ? 'bg-purple-50 border-purple-400 shadow-purple-100'
                                                    : 'bg-white border-red-500 shadow-slate-100'
                                            }
                                         `}>
                                             <div className="flex flex-col min-w-0">
                                                <div className="flex items-start gap-0.5 min-w-0 mb-0.5">
                                                    {isMakeup && <RefreshCcw size={6} className="text-orange-500 shrink-0 mt-0.5" />}
                                                    {isTrial && <Star size={6} className="text-purple-500 shrink-0 mt-0.5" />}
                                                    <span className={`text-[7px] font-black leading-tight whitespace-normal break-words ${
                                                        isMakeup ? 'text-orange-900' : isTrial ? 'text-purple-900' : 'text-slate-700'
                                                    }`}>
                                                        {student?.name.split(' ')[0]}
                                                    </span>
                                                </div>
                                                <span className={`text-[5px] font-bold leading-none block ${isMakeup ? 'text-orange-400' : isTrial ? 'text-purple-400' : 'text-slate-400'}`}>
                                                    {slot.start}-{slot.end}
                                                </span>
                                             </div>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>

        {/* Screenshot Close Button */}
        {isScreenshotMode && (
            <button 
                onClick={() => setIsScreenshotMode(false)}
                className="fixed bottom-6 right-6 p-4 bg-slate-900 text-white rounded-full shadow-2xl z-[110] hover:scale-110 transition-transform"
            >
                <X size={24} />
            </button>
        )}

        {/* Find Gaps Dialog */}
        <Dialog isOpen={!!gapDialogDay} onClose={() => setGapDialogDay(null)} title={`${gapDialogDay} (15:00+)`}>
             <div className="py-2">
                 <p className="text-xs text-slate-400 mb-4 text-center">Akşam dersleri için uygun boşluklar:</p>
                 
                 {foundGaps.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                        <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-bold text-slate-400">15:00 sonrası boşluk yok.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
                        {foundGaps.map(startTime => (
                            <button 
                                key={startTime} 
                                onClick={() => handleAddGapSlot(startTime)} 
                                className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all active:scale-95 group relative overflow-hidden"
                            >
                                <span className="text-lg font-black text-slate-700 group-hover:text-red-700 relative z-10">{startTime}</span>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-red-200 transition-colors"></div>
                            </button>
                        ))}
                    </div>
                 )}
             </div>
        </Dialog>
    </div>
  );
};
