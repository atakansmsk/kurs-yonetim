
import React from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, LessonSlot } from '../types';
import { CheckCircle2 } from 'lucide-react';

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const WORK_START_TIME = "09:00";
const WORK_END_TIME = "21:00";
const WORK_END_MINS = 21 * 60;

export const WeeklySummary: React.FC = () => {
  const { state } = useCourse();

  const getTimelineItems = (slots: LessonSlot[]) => {
      const sorted = [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      const items: React.ReactNode[] = [];

      if (sorted.length === 0) {
          items.push(
              <div key="full-empty" className="border border-dashed border-slate-200 rounded-lg p-2 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                      <div className="bg-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded text-[10px]">{WORK_START_TIME} - {WORK_END_TIME}</div>
                      <span className="text-slate-400 font-medium text-xs">Tüm Gün Boş</span>
                  </div>
              </div>
          );
          return items;
      }

      sorted.forEach((slot, i) => {
          const student = slot.studentId ? state.students[slot.studentId!] : null;
          const isLast = i === sorted.length - 1;
          
          if (i > 0) {
             const prevEnd = timeToMinutes(sorted[i-1].end);
             const currStart = timeToMinutes(slot.start);
             if (currStart > prevEnd) {
                 items.push(
                    <div key={`gap-${i}`} className="ml-10 border-l border-dashed border-slate-200 pl-4 py-1 text-[10px] font-bold text-slate-300">
                        {sorted[i-1].end} - {slot.start} Boşluk
                    </div>
                 );
             }
          }

          items.push(
              <div key={slot.id} className={`rounded-xl p-2.5 shadow-sm flex items-center justify-between border transition-all ${student ? 'bg-white border-slate-100' : 'bg-white/40 border-dashed border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                      <div className={`font-bold px-2 py-1 rounded-md text-[10px] w-16 text-center ${student ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {slot.start} - {slot.end}
                      </div>
                      <span className={`font-bold text-sm truncate max-w-[120px] ${student ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                          {student ? student.name : 'Boş'}
                      </span>
                  </div>
                  {student && <CheckCircle2 size={14} className="text-emerald-500" />}
              </div>
          );

          if (isLast) {
              const endMins = timeToMinutes(slot.end);
              if (endMins < WORK_END_MINS) {
                   items.push(
                      <div key="end-gap" className="mt-1 border border-dashed border-slate-200 rounded-lg p-2 flex items-center gap-3 bg-slate-50/30">
                          <div className="bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded text-[10px] w-16 text-center">
                              {slot.end} - {WORK_END_TIME}
                          </div>
                          <span className="text-slate-400 font-medium text-[10px]">Kapanışa kadar boş</span>
                      </div>
                   );
              }
          }
      });

      return items;
  }

  return (
    <div className="flex-col h-full bg-background overflow-y-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Haftalık Akış</h2>
            <div className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                Hedef: 21:00
            </div>
        </div>
        
        <div className="relative space-y-6 pl-1">
            {DAYS.map(day => {
                const key = `${state.currentTeacher}|${day}`;
                const slots = state.schedule[key] || [];
                
                return (
                    <div key={day} className="relative animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${slots.length > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                            <h3 className={`font-bold text-xs uppercase tracking-wider ${slots.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{day}</h3>
                        </div>
                        <div className="absolute left-[3.5px] top-6 bottom-0 w-px bg-slate-100 -z-10"></div>
                        <div className="space-y-1.5 pl-5">
                            {getTimelineItems(slots)}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
