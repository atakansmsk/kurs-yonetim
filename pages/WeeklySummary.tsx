import React, { useMemo, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot } from '../types';
import { CalendarCheck, Banknote, Clock, Star, RefreshCcw, Sparkles, User, Timer, Eye, EyeOff } from 'lucide-react';
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

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ onOpenStudentProfile }) => {
  const { state } = useCourse();
  
  // UI States
  const [gapModalData, setGapModalData] = useState<{day: WeekDay, gaps: string[]} | null>(null);
  const [showEarnings, setShowEarnings] = useState(true);

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
        <div className="bg-white px-4 py-3 border-b border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-30 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl flex flex-col items-start min-w-[120px] border border-emerald-100 relative overflow-hidden flex-1">
                <div className="flex items-center gap-1 mb-0.5 z-10 w-full justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Aylık Ciro</span>
                    <button onClick={() => setShowEarnings(!showEarnings)} className="hover:bg-emerald-100 p-1 rounded-full transition-colors -mr-1">
                        {showEarnings ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                </div>
                <span className="text-lg font-black tracking-tight z-10 truncate w-full">
                    {showEarnings ? `${monthlyEarnings.toLocaleString('tr-TR')}₺` : '*** ₺'}
                </span>
                <Banknote className="absolute right-[-10px] bottom-[-10px] opacity-10" size={50} />
            </div>
            
            <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl flex flex-col items-start min-w-[90px] border border-indigo-100 relative overflow-hidden flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5">Ders</span>
                <span className="text-lg font-black tracking-tight">{weeklyLessonCount}</span>
                <Clock className="absolute right-[-10px] bottom-[-10px] opacity-10" size={50} />
            </div>

            <div className="bg-purple-50 text-purple-700 px-3 py-2 rounded-xl flex flex-col items-start min-w-[90px] border border-purple-100 relative overflow-hidden flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5">Öğrenci</span>
                <span className="text-lg font-black tracking-tight">{totalStudents}</span>
                <User className="absolute right-[-10px] bottom-[-10px] opacity-10" size={50} />
            </div>
        </div>

        {/* Weekly Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 pb-24">
            {/* Grid yapısı: min-w kısıtlaması kaldırıldı, gap-0.5 ile sıkıştırıldı */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-2 content-start h-full w-full">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-lg sm:rounded-2xl border transition-all duration-300 ${isToday ? 'bg-white border-indigo-300 shadow-md ring-1 ring-indigo-100 z-10' : 'bg-white border-slate-100 shadow-sm'}`}>
                            
                            {/* Day Header */}
                            <button 
                                onClick={() => handleDayClick(day)}
                                className={`text-center py-1.5 sm:py-3 border-b rounded-t-lg sm:rounded-t-2xl transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50'}`}
                            >
                                <span className={`block font-black uppercase tracking-tighter text-[9px] sm:text-xs truncate px-0.5 ${isToday ? 'text-indigo-700' : 'text-slate-400'}`}>
                                    {SHORT_DAYS[day]}
                                </span>
                            </button>

                            {/* Slots */}
                            <div className="flex flex-col p-0.5 sm:p-2 gap-0.5 sm:gap-2 min-h-[60px]">
                                {slots.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-1 py-2">
                                        <span className="text-[8px] font-bold text-slate-300">-</span>
                                    </div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        
                                        // Visual Logic
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
                                        
                                        const isShort = duration <= 35;
                                        const isLong = duration >= 50;

                                        let cardClass = "bg-white border-slate-100";
                                        let textClass = "text-slate-800";
                                        let timeClass = "bg-slate-50 text-slate-500";
                                        let badge = null;

                                        if (isOccupied) {
                                            if (isMakeup) {
                                                cardClass = "bg-orange-50 border-orange-200";
                                                textClass = "text-orange-900";
                                                timeClass = "bg-white/60 text-orange-700";
                                                badge = <div className="w-1.5 h-1.5 rounded-full bg-orange-500 sm:hidden"></div>;
                                            } else if (isTrial) {
                                                cardClass = "bg-purple-50 border-purple-200";
                                                textClass = "text-purple-900";
                                                timeClass = "bg-white/60 text-purple-700";
                                                badge = <div className="w-1.5 h-1.5 rounded-full bg-purple-500 sm:hidden"></div>;
                                            } else if (isShort) {
                                                // KISA DERS RENGİ (Rose/Pembe)
                                                cardClass = "bg-rose-50 border-rose-200";
                                                textClass = "text-rose-900";
                                                timeClass = "bg-white/60 text-rose-700";
                                                badge = <div className="w-1.5 h-1.5 rounded-full bg-rose-500 sm:hidden"></div>;
                                            } else if (isLong) {
                                                // UZUN DERS RENGİ (Cyan/Mavi)
                                                cardClass = "bg-cyan-50 border-cyan-200";
                                                textClass = "text-cyan-900";
                                                timeClass = "bg-white/60 text-cyan-700";
                                                badge = <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 sm:hidden"></div>;
                                            } else {
                                                // Standart Ders
                                                cardClass = "bg-indigo-50 border-indigo-200";
                                                textClass = "text-indigo-900";
                                                timeClass = "bg-white/60 text-indigo-700";
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
                                                {/* Desktop Header / Mobile Indicator */}
                                                <div className="flex items-center justify-center sm:justify-between w-full">
                                                    <div className={`px-1 py-0.5 rounded text-[7px] sm:text-[10px] font-black leading-none ${timeClass}`}>
                                                        {slot.start}
                                                    </div>
                                                    {/* Desktop Badges */}
                                                    {isMakeup && <span className="hidden sm:block text-[8px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded ml-auto">T</span>}
                                                    {isTrial && <span className="hidden sm:block text-[8px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded ml-auto">D</span>}
                                                    {isShort && <span className="hidden sm:flex items-center gap-0.5 text-[8px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded ml-auto"><Timer size={8} /></span>}
                                                    
                                                    {/* Mobile Dots */}
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