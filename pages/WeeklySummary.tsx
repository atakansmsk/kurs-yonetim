
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { Maximize2, X, Star, RefreshCcw, CalendarCheck, Search, Plus } from 'lucide-react';
import { Dialog } from '../components/Dialog';

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

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const DEFAULT_LESSON_DURATION = 40;
const SCAN_START_MINUTES = 9 * 60; // Start finding gaps from 09:00
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
        
        {/* Header - Hidden in Screenshot Mode if needed, or styled differently */}
        {!isScreenshotMode && (
            <div className="flex items-center justify-between p-5 bg-[#F8FAFC] sticky top-0 z-20 border-b border-slate-200/50 backdrop-blur-sm">
                 <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-red-600 text-white flex items-center justify-center rounded-lg shadow-red-200 shadow-lg">
                         <CalendarCheck size={18} />
                     </div>
                     <div>
                         <span className="text-[10px] font-black text-red-400 tracking-widest uppercase block">HAFTALIK</span>
                         <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{state.currentTeacher}</h2>
                     </div>
                 </div>

                 <div className="flex items-center gap-2">
                     <div className="flex gap-1 mr-1">
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">{totalLessons} Ders</span>
                     </div>
                     
                     <button 
                        onClick={() => setIsScreenshotMode(!isScreenshotMode)}
                        className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 transition-colors shadow-sm"
                        title="Tam Ekran / Yazdır"
                     >
                         <Maximize2 size={18} />
                     </button>
                 </div>
            </div>
        )}

        {/* Timeline Grid */}
        <div className={`flex-1 flex relative ${isScreenshotMode ? 'bg-white p-2' : 'px-2 pb-20'}`}>
             
             {/* Time Ruler */}
             <div className="flex flex-col pt-8 pr-1 gap-[calc(4vh)] sm:gap-12 text-[8px] font-bold text-slate-300 text-right select-none min-w-[24px]">
                 <span>09:00</span>
                 <span>12:00</span>
                 <span>15:00</span>
                 <span>18:00</span>
                 <span>21:00</span>
             </div>

             {/* Days Grid */}
             <div className="flex-1 grid grid-cols-7 gap-1 sm:gap-2 h-full">
                 {DAYS.map((day) => {
                     const isToday = day === todayName && !isScreenshotMode;
                     const key = `${state.currentTeacher}|${day}`;
                     const lessons = (state.schedule[key] || [])
                        .filter(s => s.studentId)
                        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

                     return (
                         <div key={day} className={`flex flex-col min-w-0 rounded-2xl ${isToday ? 'bg-red-50/30 ring-1 ring-red-100' : ''}`}>
                             {/* Clickable Header for Gap Finding */}
                             <button 
                                onClick={() => handleFindGaps(day)}
                                className={`py-3 text-center mb-1 group rounded-xl transition-colors ${isToday ? 'bg-red-100/50' : 'hover:bg-slate-100 cursor-pointer'}`}
                             >
                                 <span className={`text-[9px] font-black block leading-none mb-0.5 ${isToday ? 'text-red-600' : 'text-slate-400 group-hover:text-red-500'}`}>
                                     {SHORT_DAYS[day].substring(0, 3)}
                                 </span>
                                 <span className={`text-[6px] font-bold ${isToday ? 'text-red-400' : 'text-slate-300'} group-hover:hidden`}>
                                     {lessons.length} Ders
                                 </span>
                                 <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[6px] font-bold text-red-500 animate-in fade-in">
                                     <Search size={6} /> Boşluk
                                 </span>
                             </button>

                             {/* Lessons Column */}
                             <div className="flex-1 space-y-1 relative">
                                 {/* Grid Lines (Visual Guide) */}
                                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                                     <div className="border-t border-slate-200 w-full mt-[calc(0%)]"></div>
                                     <div className="border-t border-slate-200 w-full mt-[calc(25%)]"></div>
                                     <div className="border-t border-slate-200 w-full mt-[calc(50%)]"></div>
                                     <div className="border-t border-slate-200 w-full mt-[calc(75%)]"></div>
                                     <div className="border-t border-slate-200 w-full mt-[calc(100%)]"></div>
                                 </div>

                                 {lessons.map((slot) => {
                                     const student = state.students[slot.studentId!];
                                     const isMakeup = slot.label === 'MAKEUP';
                                     const isTrial = slot.label === 'TRIAL';

                                     return (
                                         <div key={slot.id} className={`relative z-10 px-1 py-1.5 rounded-lg shadow-sm border-l-2 mb-1 group cursor-default transition-transform hover:scale-[1.02] ${
                                             isMakeup ? 'bg-rose-50 border-rose-400' 
                                             : isTrial ? 'bg-amber-50 border-amber-400'
                                             : 'bg-white border-red-500'
                                         }`}>
                                             <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-0.5 min-w-0 mb-0.5">
                                                    {isMakeup && <RefreshCcw size={6} className="text-rose-500 shrink-0" />}
                                                    {isTrial && <Star size={6} className="text-amber-500 shrink-0" />}
                                                    <span className={`text-[7px] font-black truncate leading-tight ${
                                                        isMakeup ? 'text-rose-900' : isTrial ? 'text-amber-900' : 'text-slate-800'
                                                    }`}>
                                                        {student?.name.split(' ')[0]}
                                                    </span>
                                                </div>
                                                <span className={`text-[5px] font-bold leading-none ${isMakeup ? 'text-rose-400' : isTrial ? 'text-amber-400' : 'text-slate-400'}`}>
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
                className="fixed bottom-5 right-5 p-3 bg-slate-900 text-white rounded-full shadow-xl z-[110]"
            >
                <X size={24} />
            </button>
        )}

        {/* Find Gaps Dialog */}
        <Dialog isOpen={!!gapDialogDay} onClose={() => setGapDialogDay(null)} title={`${gapDialogDay} Boşlukları`}>
             <div className="py-2">
                 <p className="text-xs text-slate-400 mb-3 text-center">Aşağıdaki saatler {DEFAULT_LESSON_DURATION} dk için uygundur.</p>
                 
                 {foundGaps.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl">
                        <p className="text-sm font-bold text-slate-400">Uygun boşluk bulunamadı.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
                        {foundGaps.map(startTime => (
                            <button 
                                key={startTime} 
                                onClick={() => handleAddGapSlot(startTime)} 
                                className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all active:scale-95 group"
                            >
                                <span className="text-sm font-black text-slate-700 group-hover:text-red-700">{startTime}</span>
                                <Plus size={12} className="text-slate-300 group-hover:text-red-400 mt-1" />
                            </button>
                        ))}
                    </div>
                 )}
             </div>
        </Dialog>
    </div>
  );
};
