
import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot } from '../types';
import { CalendarCheck, Clock, Star, RefreshCcw, Sparkles, User, Timer, Eye, EyeOff, AlertTriangle, Users } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface WeeklySummaryProps {
    onOpenStudentProfile: (id: string) => void;
}

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "Pzt", "Salı": "Sal", "Çarşamba": "Çar", "Perşembe": "Per", "Cuma": "Cum", "Cmt": "Cmt", "Pazar": "Paz"
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

// Renk Haritası
const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  rose: 'bg-rose-50 border-rose-200 text-rose-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
};

const TIME_COLOR_MAP: Record<string, string> = {
  indigo: 'bg-white/60 text-indigo-700',
  rose: 'bg-white/60 text-rose-700',
  emerald: 'bg-white/60 text-emerald-700',
  amber: 'bg-white/60 text-amber-700',
  cyan: 'bg-white/60 text-cyan-700',
  purple: 'bg-white/60 text-purple-700',
};

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state } = useCourse();
  
  // UI States
  const [gapModalData, setGapModalData] = useState<{day: WeekDay, gaps: string[]} | null>(null);

  // --- STATS ---
  const { totalStudents, weeklyLessonCount } = useMemo(() => {
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

    return { totalStudents: uniqueStudentIds.size, weeklyLessonCount: lessonCount };
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
          
          if (s > currentPointer) {
              while (currentPointer + SLOT_DURATION <= s) {
                  foundGaps.push(minutesToTime(currentPointer));
                  currentPointer += SLOT_DURATION;
              }
          }
          currentPointer = Math.max(currentPointer, e);
      });

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
        {/* Header Stats - Sadeleştirilmiş Özet */}
        <div className="bg-white px-5 py-4 border-b border-slate-100 shadow-sm sticky top-0 z-30">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800">Haftalık Özet</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ders ve Öğrenci Yoğunluğu</p>
                </div>
                <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <Users size={18} />
                    <div>
                        <span className="text-lg font-black block leading-none">{totalStudents}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">Öğrenci</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Bu hafta planlı toplam <span className="text-indigo-600 font-black">{weeklyLessonCount} ders</span> var.</span>
            </div>
        </div>

        {/* Weekly Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 pb-24">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-2 content-start h-full w-full">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-lg sm:rounded-2xl border transition-all duration-300 ${isToday ? 'bg-white border-indigo-300 shadow-md ring-1 ring-indigo-100 z-10' : 'bg-white border-slate-100 shadow-sm'}`}>
                            
                            <button 
                                onClick={() => handleDayClick(day)}
                                className={`text-center py-1.5 sm:py-3 border-b rounded-t-lg sm:rounded-t-2xl transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50'}`}
                            >
                                <span className={`block font-black uppercase tracking-tighter text-[9px] sm:text-xs truncate px-0.5 ${isToday ? 'text-indigo-700' : 'text-slate-400'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                            </button>

                            <div className="flex flex-col p-0.5 sm:p-2 gap-0.5 sm:gap-2 min-h-[60px]">
                                {slots.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-1 py-2">
                                        <span className="text-[8px] font-bold text-slate-300">-</span>
                                    </div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        
                                        let cardClass = "bg-white border-slate-100";
                                        let textClass = "text-slate-800";
                                        let timeClass = "bg-slate-50 text-slate-500";
                                        let badge = null;
                                        
                                        if (isOccupied && student) {
                                            const color = student.color || 'indigo';
                                            cardClass = COLOR_MAP[color] || COLOR_MAP['indigo'];
                                            timeClass = TIME_COLOR_MAP[color] || TIME_COLOR_MAP['indigo'];
                                            
                                            if (student.nextLessonNote) {
                                                badge = <div className="text-red-500"><AlertTriangle size={8} fill="currentColor" /></div>;
                                            } else {
                                                const dotColor = color === 'rose' ? 'bg-rose-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'cyan' ? 'bg-cyan-500' : color === 'purple' ? 'bg-purple-500' : 'bg-indigo-500';
                                                badge = <div className={`w-1.5 h-1.5 rounded-full ${dotColor} sm:hidden`}></div>;
                                            }
                                        }

                                        if (!isOccupied) return (
                                            <div key={slot.id} className="p-1 sm:p-2.5 rounded sm:rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-center sm:justify-between opacity-60">
                                                 <span className="text-[8px] sm:text-[10px] font-bold text-slate-400">{slot.start}</span>
                                            </div>
                                        );

                                        return (
                                            <div 
                                                key={slot.id}
                                                onClick={() => onOpenStudentProfile(slot.studentId!)}
                                                className={`relative flex flex-col items-center sm:items-stretch gap-0.5 sm:gap-1.5 p-1 sm:p-2.5 rounded sm:rounded-xl border shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${cardClass}`}
                                            >
                                                <div className="flex items-center justify-center sm:justify-between w-full">
                                                    <div className={`px-1 py-0.5 rounded text-[7px] sm:text-[10px] font-black leading-none ${timeClass}`}>
                                                        {slot.start}
                                                    </div>
                                                    {badge}
                                                </div>

                                                <div className={`font-bold text-[9px] sm:text-xs truncate w-full text-center sm:text-left leading-tight ${textClass}`}>
                                                    {student?.name.split(' ')[0] || "İsimsiz"}
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
