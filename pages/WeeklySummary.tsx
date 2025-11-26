
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay } from '../types';
import { CalendarRange, Maximize2, X } from 'lucide-react';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Gün İsimleri (Kısa)
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

  // Tüm haftanın ders sayısını hesapla
  const totalLessons = DAYS.reduce((acc, day) => {
    const key = `${state.currentTeacher}|${day}`;
    const count = (state.schedule[key] || []).filter(s => s.studentId).length;
    return acc + count;
  }, 0);

  // Günü dolduran (Dersler + Boşluklar) listeyi oluşturan fonksiyon
  const getFullDaySchedule = (day: WeekDay) => {
      const key = `${state.currentTeacher}|${day}`;
      const lessons = (state.schedule[key] || [])
          .filter(s => s.studentId) // Sadece dolu dersleri al
          .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

      const blocks: { type: 'LESSON' | 'EMPTY', start: string, end: string, data?: any }[] = [];
      let currentPointer = timeToMinutes(WORK_START);
      const endOfDay = timeToMinutes(WORK_END);

      lessons.forEach(lesson => {
          const lStart = timeToMinutes(lesson.start);
          const lEnd = timeToMinutes(lesson.end);

          // Eğer dersten önce boşluk varsa ekle
          if (lStart > currentPointer) {
              blocks.push({
                  type: 'EMPTY',
                  start: minutesToTime(currentPointer),
                  end: minutesToTime(lStart)
              });
          }

          // Dersi ekle
          blocks.push({
              type: 'LESSON',
              start: lesson.start,
              end: lesson.end,
              data: lesson
          });

          currentPointer = Math.max(currentPointer, lEnd);
      });

      // Gün sonuna kadar boşluk varsa ekle
      if (currentPointer < endOfDay) {
          blocks.push({
              type: 'EMPTY',
              start: minutesToTime(currentPointer),
              end: WORK_END
          });
      }

      return blocks;
  };

  return (
    <div className={`flex flex-col h-full bg-white ${isScreenshotMode ? 'fixed inset-0 z-[100] w-full h-full overflow-hidden' : 'overflow-y-auto no-scrollbar'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-slate-100 bg-white ${isScreenshotMode ? 'px-2 py-2 h-10 shadow-sm' : 'px-6 py-5 sticky top-0 z-10'}`}>
            <div>
                <span className={`font-bold text-indigo-500 tracking-widest uppercase block ${isScreenshotMode ? 'text-[6px] mb-0' : 'text-[10px] mb-1'}`}>PROGRAM</span>
                <h2 className={`font-black text-slate-900 leading-none tracking-tight ${isScreenshotMode ? 'text-xs' : 'text-xl'}`}>{state.currentTeacher}</h2>
            </div>
            
            <div className="flex items-center gap-3">
                <div className={`text-right ${isScreenshotMode ? 'mr-1' : ''}`}>
                    <div className="flex items-center gap-1 justify-end">
                        <span className={`font-black text-slate-900 leading-none ${isScreenshotMode ? 'text-xs' : 'text-2xl'}`}>{totalLessons}</span>
                        {!isScreenshotMode && <CalendarRange size={18} className="text-slate-300" />}
                    </div>
                </div>

                {!isScreenshotMode ? (
                    <button 
                        onClick={() => setIsScreenshotMode(true)}
                        className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                        title="Tam Ekran / Yazdır"
                    >
                        <Maximize2 size={20} />
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsScreenshotMode(false)}
                        className="p-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors print:hidden"
                        title="Kapat"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
        
        {/* 7-Column Timeline Layout */}
        <div className={`flex-1 flex flex-col ${isScreenshotMode ? 'p-1' : 'p-4 pb-24'}`}>
            <div className="flex-1 flex gap-0.5 border-t border-slate-100">
                {DAYS.map((day) => {
                    const blocks = getFullDaySchedule(day);
                    
                    return (
                        <div key={day} className="flex-1 flex flex-col min-w-0 border-r border-slate-100 last:border-r-0">
                            {/* Gün Başlığı */}
                            <div className={`text-center font-black text-slate-700 bg-slate-50 border-b border-slate-100 ${isScreenshotMode ? 'text-[6px] py-1' : 'text-[10px] py-2'}`}>
                                {SHORT_DAYS[day]}
                            </div>

                            {/* Bloklar */}
                            <div className="flex-1 flex flex-col">
                                {blocks.map((block, idx) => {
                                    // Yükseklik hesabı (Süreye göre orantılı)
                                    const startMin = timeToMinutes(block.start);
                                    const endMin = timeToMinutes(block.end);
                                    const duration = endMin - startMin;
                                    
                                    // Flex-grow kullanarak orantılı yükseklik sağlıyoruz
                                    
                                    if (block.type === 'EMPTY') {
                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ flexGrow: duration }}
                                                className="w-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] bg-white opacity-40 flex items-center justify-center border-b border-slate-50 min-h-[10px]"
                                            >
                                                {/* Boşluklarda saat yazmasın, çok kalabalık olur */}
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
                                                className={`w-full flex flex-col justify-center px-0.5 py-0.5 border-b border-white relative overflow-hidden min-h-[20px] ${
                                                    isMakeup ? 'bg-orange-400 text-white' : 
                                                    isTrial ? 'bg-purple-500 text-white' : 
                                                    'bg-indigo-600 text-white'
                                                }`}
                                            >
                                                <div className={`font-bold leading-none truncate ${isScreenshotMode ? 'text-[5px]' : 'text-[8px]'}`}>
                                                    {block.start}
                                                </div>
                                                <div className={`font-bold leading-tight truncate mt-px opacity-90 ${isScreenshotMode ? 'text-[6px]' : 'text-[9px]'}`}>
                                                    {student?.name.split(' ')[0]}
                                                </div>
                                                {(isMakeup || isTrial) && (
                                                    <div className={`absolute top-0 right-0 text-[4px] font-bold px-0.5 bg-black/20`}>
                                                        {isMakeup ? 'T' : 'D'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Alt Bilgi */}
            {isScreenshotMode && (
                <div className="mt-1 flex justify-between items-center px-2">
                     <span className="text-[6px] font-bold text-slate-300 uppercase tracking-widest">KURS YÖNETİM PRO</span>
                     <div className="flex gap-2 text-[6px] font-bold text-slate-400 uppercase">
                        <span className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 bg-indigo-600 rounded-sm"></div> NORMAL</span>
                        <span className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 bg-orange-400 rounded-sm"></div> TELAFİ</span>
                        <span className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm"></div> DENEME</span>
                     </div>
                </div>
            )}
        </div>
    </div>
  );
};
