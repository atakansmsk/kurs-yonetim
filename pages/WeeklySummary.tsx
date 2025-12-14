import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot } from '../types';
import { CalendarCheck, Banknote, Clock, Star, RefreshCcw, Sparkles, User, Timer } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface WeeklySummaryProps {
    onOpenStudentProfile: (id: string) => void;
}

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", "Salı": "SAL", "Çarşamba": "ÇAR", "Perşembe": "PER", "Cuma": "CUM", "Cmt": "CMT", "Pazar": "PAZ"
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

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state } = useCourse();
  
  // UI States
  const [gapModalData, setGapModalData] = useState<{day: WeekDay, gaps: string[]} | null>(null);

  // --- STATS & EARNINGS ---
  const { monthlyEarnings, totalStudents, weeklyLessonCount } = useMemo(() => {
    const uniqueStudentIds = new Set<string>();
    let lessonCount = 0;
    
    DAYS.forEach(day => {
        const key = `${state.currentTeacher}|${day}`;
        (state.schedule[key] || []).forEach(s => {
            if (s.studentId) {
                if (s.label !== 'MAKEUP' && s.label !== 'TRIAL') {
                    uniqueStudentIds.add(s.studentId);
                }
                lessonCount++;
            }
        });
    });

    let earnings = 0;
    uniqueStudentIds.forEach(id => {
        const student = state.students[id];
        if (student) earnings += student.fee || 0;
    });

    return { monthlyEarnings: earnings, totalStudents: uniqueStudentIds.size, weeklyLessonCount: lessonCount };
  }, [state.schedule, state.currentTeacher, state.students]);

  const todayIndex = new Date().getDay(); 
  const jsDayToAppKey: Record<number, WeekDay> = { 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar" };
  const currentDayName = jsDayToAppKey[todayIndex];

  // --- HANDLERS ---
  const getDaySlots = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      return (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  };

  const handleDayClick = (day: WeekDay) => {
      const slots = getDaySlots(day);
      const foundGaps: string[] = [];
      
      let currentPointer = 15 * 60; // 15:00 Start scan
      const END_OF_DAY = 21 * 60;
      const SLOT_DURATION = 40;

      const relevantSlots = slots.filter(s => timeToMinutes(s.end) > currentPointer);

      relevantSlots.forEach(slot => {
          const s = timeToMinutes(slot.start);
          const e = timeToMinutes(slot.end);
          
          // Check gap before this slot
          if (s > currentPointer) {
              // how many chunks
              while (currentPointer + SLOT_DURATION <= s) {
                  foundGaps.push(minutesToTime(currentPointer));
                  currentPointer += SLOT_DURATION;
              }
          }
          currentPointer = Math.max(currentPointer, e);
      });

      // After last slot
      while (currentPointer + SLOT_DURATION <= END_OF_DAY) {
          foundGaps.push(minutesToTime(currentPointer));
          currentPointer += SLOT_DURATION;
      }

      if (foundGaps.length > 0) {
          setGapModalData({ day, gaps: foundGaps });
      } else {
          alert(`${day} günü için uygun boşluk bulunamadı (15:00 sonrası).`);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* Header Stats */}
        <div className="bg-white px-4 py-4 border-b border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-30 flex gap-3 overflow-x-auto no-scrollbar">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl flex flex-col items-start min-w-[120px] border border-emerald-100 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Aylık Ciro</span>
                <span className="text-2xl font-black tracking-tight">{monthlyEarnings.toLocaleString('tr-TR')}₺</span>
                <Banknote className="absolute right-[-10px] bottom-[-10px] opacity-10" size={60} />
            </div>
            
            <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-2xl flex flex-col items-start min-w-[120px] border border-indigo-100 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Ders Yükü</span>
                <span className="text-2xl font-black tracking-tight">{weeklyLessonCount}</span>
                <Clock className="absolute right-[-10px] bottom-[-10px] opacity-10" size={60} />
            </div>

            <div className="bg-purple-50 text-purple-700 px-4 py-3 rounded-2xl flex flex-col items-start min-w-[120px] border border-purple-100 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Öğrenci</span>
                <span className="text-2xl font-black tracking-tight">{totalStudents}</span>
                <User className="absolute right-[-10px] bottom-[-10px] opacity-10" size={60} />
            </div>
        </div>

        {/* Weekly Grid */}
        <div className="flex-1 overflow-y-auto p-2 pb-24">
            <div className="grid gap-2 content-start h-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-2xl border transition-all duration-300 ${isToday ? 'bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-50 z-10' : 'bg-white border-slate-100 shadow-sm'}`}>
                            
                            {/* Day Header */}
                            <button 
                                onClick={() => handleDayClick(day)}
                                className={`text-center py-3 border-b rounded-t-2xl transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50'}`}
                            >
                                <span className={`block font-black uppercase tracking-wider text-xs ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                                    {day}
                                </span>
                            </button>

                            {/* Slots */}
                            <div className="flex flex-col p-2 gap-2 min-h-[100px]">
                                {slots.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-1 py-4">
                                        <CalendarCheck size={20} className="text-slate-300" />
                                        <span className="text-[10px] font-bold text-slate-300">Boş</span>
                                    </div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        
                                        // Visual Logic
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
                                        const isShort = duration <= 25;

                                        let cardClass = "bg-white border-slate-100";
                                        let textClass = "text-slate-800";
                                        let timeClass = "bg-slate-50 text-slate-500";
                                        let badge = null;

                                        if (isOccupied) {
                                            if (isMakeup) {
                                                cardClass = "bg-orange-50 border-orange-200";
                                                textClass = "text-orange-900";
                                                timeClass = "bg-white/60 text-orange-700";
                                                badge = <span className="text-[8px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded ml-auto">TELAFİ</span>;
                                            } else if (isTrial) {
                                                cardClass = "bg-purple-50 border-purple-200";
                                                textClass = "text-purple-900";
                                                timeClass = "bg-white/60 text-purple-700";
                                                badge = <span className="text-[8px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded ml-auto">DENEME</span>;
                                            } else if (isShort) {
                                                // Short Lesson Logic
                                                cardClass = "bg-rose-50 border-rose-200";
                                                textClass = "text-rose-900";
                                                timeClass = "bg-white/60 text-rose-700";
                                                badge = <span className="flex items-center gap-0.5 text-[8px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded ml-auto"><Timer size={8} /> {duration}dk</span>;
                                            } else {
                                                // Standard Lesson
                                                cardClass = "bg-indigo-50 border-indigo-200";
                                                textClass = "text-indigo-900";
                                                timeClass = "bg-white/60 text-indigo-700";
                                            }
                                        }

                                        if (!isOccupied) return (
                                            <div key={slot.id} className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between opacity-60">
                                                 <span className="text-[10px] font-bold text-slate-400">{slot.start}</span>
                                            </div>
                                        );

                                        return (
                                            <div 
                                                key={slot.id}
                                                onClick={() => onOpenStudentProfile(slot.studentId!)}
                                                className={`relative flex flex-col gap-1.5 p-2.5 rounded-xl border shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${cardClass}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-black ${timeClass}`}>
                                                        {slot.start}
                                                    </div>
                                                    {badge}
                                                </div>

                                                <div className={`font-bold text-xs truncate leading-tight ${textClass}`}>
                                                    {student?.name || "İsimsiz"}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Gap Modal */}
        <Dialog 
            isOpen={!!gapModalData} 
            onClose={() => setGapModalData(null)} 
            title={`${gapModalData?.day || ''} Boşluklar`}
            actions={<button onClick={() => setGapModalData(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm">Tamam</button>}
        >
            <div className="py-2 grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
                {gapModalData?.gaps.map(g => (
                    <div key={g} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span className="text-lg font-bold text-slate-700">{g}</span>
                    </div>
                ))}
            </div>
        </Dialog>
    </div>
  );
};