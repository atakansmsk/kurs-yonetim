
import React, { useState, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot, Student } from '../types';
import { Plus, ChevronRight, Trash2, UserX, MoreHorizontal, CalendarDays, ArrowRight, Clock, Moon, CheckCircle2, Sparkles, Layers, Sun } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface DailyScheduleProps {
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

const WORK_END_MINUTES = 21 * 60;
const DEFAULT_LESSON_DURATION = 40;
const SCAN_START_MINUTES = 15 * 60; 

export const DailySchedule: React.FC<DailyScheduleProps> = ({ onOpenStudentProfile }) => {
  const { state, actions } = useCourse();
  
  const [selectedDay, setSelectedDay] = useState<WeekDay>(() => {
    const jsDayToAppKey: Record<number, WeekDay> = {
        0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt"
    };
    return jsDayToAppKey[new Date().getDay()] || "Pazartesi";
  });
  
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSlotOptionsOpen, setIsSlotOptionsOpen] = useState(false);
  const [isFindGapModalOpen, setIsFindGapModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<LessonSlot | null>(null);
  const [suggestedGaps, setSuggestedGaps] = useState<string[]>([]);

  const [newTimeStart, setNewTimeStart] = useState("12:00");
  const [newTimeEnd, setNewTimeEnd] = useState("12:40");
  const [duration, setDuration] = useState(DEFAULT_LESSON_DURATION); 
  
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookFee, setBookFee] = useState("");
  const [existingStudentId, setExistingStudentId] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState<'REGULAR' | 'MAKEUP' | 'TRIAL'>('REGULAR');
  const [studentCredit, setStudentCredit] = useState(0);

  const rawSlots = state.schedule[`${state.currentTeacher}|${selectedDay}`] || [];
  const slots = [...rawSlots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  const handleFindGaps = () => {
      const foundGaps: string[] = [];
      let currentPointer = SCAN_START_MINUTES;

      slots.forEach(slot => {
          const slotStart = timeToMinutes(slot.start);
          const slotEnd = timeToMinutes(slot.end);

          if (slotEnd > currentPointer) {
               while (currentPointer + DEFAULT_LESSON_DURATION <= slotStart) {
                  foundGaps.push(minutesToTime(currentPointer));
                  currentPointer += DEFAULT_LESSON_DURATION; 
               }
               currentPointer = Math.max(currentPointer, slotEnd);
          }
      });

      while (currentPointer + DEFAULT_LESSON_DURATION <= WORK_END_MINUTES) {
          foundGaps.push(minutesToTime(currentPointer));
          currentPointer += DEFAULT_LESSON_DURATION;
      }

      setSuggestedGaps(foundGaps);
      setIsFindGapModalOpen(true);
  };

  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    const startMins = timeToMinutes(newTimeStart);
    setNewTimeEnd(minutesToTime(startMins + mins));
  };

  const handleStartTimeChange = (val: string) => {
    setNewTimeStart(val);
    const startMins = timeToMinutes(val);
    setNewTimeEnd(minutesToTime(startMins + duration));
  };

  const handleBookStudent = () => {
    if (!activeSlot) return;
    let studentId = existingStudentId;
    if (!studentId && bookName) {
      const fee = lessonType === 'TRIAL' ? 0 : (parseFloat(bookFee) || 0);
      studentId = actions.addStudent(bookName, bookPhone, fee);
    }
    if (studentId) {
      actions.bookSlot(selectedDay, activeSlot.id, studentId, lessonType);
      setIsBookModalOpen(false);
      resetBookForm();
    }
  };

  const resetBookForm = () => {
    setBookName(""); setBookPhone(""); setBookFee(""); setExistingStudentId(null); setLessonType('REGULAR'); setStudentCredit(0);
  };

  const openAddSlotModal = (start?: string, end?: string) => {
    if (start) {
        setNewTimeStart(start);
        if (end) {
            setNewTimeEnd(end);
            const diff = timeToMinutes(end) - timeToMinutes(start);
            setDuration(diff > 0 ? diff : DEFAULT_LESSON_DURATION);
        } else {
            const startMins = timeToMinutes(start);
            setNewTimeEnd(minutesToTime(startMins + DEFAULT_LESSON_DURATION));
            setDuration(DEFAULT_LESSON_DURATION);
        }
    } else {
        setNewTimeStart("12:00");
        setNewTimeEnd(`12:${DEFAULT_LESSON_DURATION}`);
        setDuration(DEFAULT_LESSON_DURATION);
    }
    setIsTimeModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md pt-2 pb-0 px-2 z-20 sticky top-0 border-b border-slate-100 shadow-sm shrink-0">
        <div className="flex overflow-x-auto no-scrollbar gap-1 bg-slate-50 p-1 rounded-xl">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all duration-200 text-center ${
                selectedDay === day ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {SHORT_DAYS[day]}
            </button>
          ))}
        </div>
        
        <button 
            onClick={handleFindGaps}
            className="w-full mt-2 mb-2 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 active:scale-95 transition-all border border-indigo-100"
        >
            <Sparkles size={14} fill="currentColor" className="opacity-50" />
            <span>Akıllı Boşluk Bulucu</span>
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40">
        {slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center min-h-[300px]">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-50">
                 <CalendarDays size={28} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-800 font-bold text-lg mb-1">Program Boş</p>
            <button onClick={() => openAddSlotModal("09:00")} className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Plus size={16} /> İlk Saati Ekle
            </button>
          </div>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-[24px] top-2 bottom-2 w-px bg-slate-100 -z-10"></div>

            {slots.map((slot, idx) => {
              const isOccupied = !!slot.studentId;
              const student = slot.studentId ? state.students[slot.studentId] : null;
              const isMakeup = slot.label === 'MAKEUP';
              const isTrial = slot.label === 'TRIAL';
              
              let gapElement = null;
              if (idx < slots.length - 1) {
                  const currentEnd = timeToMinutes(slot.end);
                  const nextStart = timeToMinutes(slots[idx + 1].start);
                  const diff = nextStart - currentEnd;
                  
                  if (diff > 0) {
                      gapElement = (
                          <div className="flex items-center gap-3 my-0.5 opacity-50 hover:opacity-100 transition-opacity">
                              <div className="w-[48px] flex justify-center shrink-0"></div>
                              <button 
                                onClick={() => openAddSlotModal(slot.end, slots[idx + 1].start)}
                                className="flex-1 h-5 flex items-center justify-center gap-1 text-[9px] font-bold text-slate-300 hover:text-indigo-500"
                              >
                                  <span>+ {diff} dk</span>
                              </button>
                          </div>
                      );
                  }
              }

              return (
                <React.Fragment key={slot.id}>
                    <div className="flex gap-3 relative py-0.5">
                        <div className="flex flex-col items-center pt-1 shrink-0 w-[48px]">
                            <div className="w-full text-center">
                                <span className="text-[11px] font-bold text-slate-600 tracking-tight block">{slot.start}</span>
                                <span className="text-[8px] font-medium text-slate-300 block -mt-0.5">{slot.end}</span>
                            </div>
                        </div>

                        <div 
                            onClick={() => isOccupied ? onOpenStudentProfile(slot.studentId!) : ((setActiveSlot(slot), resetBookForm(), setIsBookModalOpen(true)))}
                            className={`flex-1 relative overflow-hidden rounded-xl transition-all duration-200 min-h-[46px] border-l-[3px] shadow-sm ${
                                isOccupied 
                                ? (isMakeup ? 'bg-orange-50 border-orange-400 active:scale-[0.99]' 
                                    : isTrial ? 'bg-purple-50 border-purple-400 active:scale-[0.99]'
                                    : 'bg-indigo-50 border-indigo-500 active:scale-[0.99]')
                                : 'bg-white border-slate-200 cursor-pointer active:scale-[0.99]'
                            }`}
                        >
                            <div className="px-3 py-1.5 flex items-center justify-between gap-2 h-full">
                                {isOccupied ? (
                                    <>
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className="min-w-0">
                                                <h4 className={`font-bold truncate text-[13px] leading-tight ${
                                                    isMakeup ? 'text-orange-900' 
                                                    : isTrial ? 'text-purple-900'
                                                    : 'text-indigo-900'
                                                }`}>{student?.name}</h4>
                                                
                                                <div className="flex gap-1">
                                                    {isMakeup && <span className="text-[8px] font-bold text-orange-600 opacity-80">TELAFİ</span>}
                                                    {isTrial && <span className="text-[8px] font-bold text-purple-600 opacity-80">DENEME</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className={
                                             isMakeup ? 'text-orange-200' 
                                            : isTrial ? 'text-purple-200'
                                            : 'text-indigo-200'
                                        } />
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                            <h4 className="font-bold text-slate-400 text-[10px] tracking-wide">MÜSAİT</h4>
                                        </div>
                                        <Plus size={14} className="text-slate-300" />
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveSlot(slot); setIsSlotOptionsOpen(true); }}
                                className={`absolute top-1 right-1 p-1 z-20 transition-colors rounded-md ${isOccupied ? 'opacity-0' : 'text-slate-300 hover:text-slate-500'}`}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </div>
                    </div>
                    {gapElement}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={() => openAddSlotModal()} className="fixed bottom-24 right-5 w-12 h-12 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-400/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30"><Plus size={24} strokeWidth={2} /></button>

      <Dialog isOpen={isTimeModalOpen} onClose={() => setIsTimeModalOpen(false)} title="Saat Ekle" actions={<><button onClick={() => setIsTimeModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={() => { actions.addSlot(selectedDay, newTimeStart, newTimeEnd); setIsTimeModalOpen(false); }} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm">Ekle</button></>}>
        <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-center gap-3">
                 <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 text-center">BAŞLANGIÇ</label><input type="time" value={newTimeStart} onChange={(e) => handleStartTimeChange(e.target.value)} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 rounded-xl p-2 text-center outline-none" /></div>
                 <ArrowRight size={20} className="text-slate-300 mt-5" />
                 <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 text-center">BİTİŞ</label><input type="time" value={newTimeEnd} onChange={(e) => { setNewTimeEnd(e.target.value); setDuration(0); }} className="w-full text-2xl font-bold text-slate-800 bg-slate-50 rounded-xl p-2 text-center outline-none" /></div>
            </div>
            <div className="flex justify-center gap-2">{[20, 40, 50].map(mins => (<button key={mins} onClick={() => handleDurationChange(mins)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${duration === mins ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>{mins} dk</button>))}</div>
        </div>
      </Dialog>

      <Dialog isOpen={isFindGapModalOpen} onClose={() => setIsFindGapModalOpen(false)} title="Boş Saatler">
        <div className="py-2">{suggestedGaps.length === 0 ? (<p className="text-center text-slate-400 text-sm">Uygun boşluk bulunamadı.</p>) : (<div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">{suggestedGaps.map(startTime => {const endMins = timeToMinutes(startTime) + 40; const endTime = minutesToTime(endMins); return (<button key={startTime} onClick={() => { openAddSlotModal(startTime, endTime); setIsFindGapModalOpen(false); }} className="p-3 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-center"><span className="text-lg font-bold text-slate-700 block">{startTime}</span><span className="text-xs text-slate-400">{endTime}</span></button>);})}</div>)}</div>
      </Dialog>

      <Dialog isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} title="Ders Kaydı" actions={<><button onClick={() => setIsBookModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleBookStudent} disabled={!existingStudentId && !bookName} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Kaydet</button></>}>
        <div className="space-y-3 pt-1">
          <input type="text" value={bookName} onChange={(e) => { setBookName(e.target.value); const match = (Object.values(state.students) as Student[]).find(s => s.name.toLowerCase() === e.target.value.toLowerCase()); if(match) { setExistingStudentId(match.id); setBookPhone(match.phone); setBookFee(match.fee.toString()); match.makeupCredit > 0 ? (setStudentCredit(match.makeupCredit), setLessonType('MAKEUP')) : setStudentCredit(0); } else { setExistingStudentId(null); setStudentCredit(0); } }} placeholder="Öğrenci Adı..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" autoFocus />
          {studentCredit > 0 && <div className="p-2 bg-orange-50 text-orange-600 text-xs font-bold rounded-lg flex items-center gap-1"><Layers size={12}/> {studentCredit} Telafi hakkı var</div>}
          <div className="grid grid-cols-2 gap-3"><input type="tel" value={bookPhone} onChange={e=>setBookPhone(e.target.value)} placeholder="Tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />{lessonType !== 'TRIAL' && <input type="number" value={bookFee} onChange={e=>setBookFee(e.target.value)} placeholder="Ücret" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />}</div>
          <div className="grid grid-cols-3 gap-2 mt-2"><button onClick={() => setLessonType('REGULAR')} className={`p-2 rounded-xl border text-xs font-bold ${lessonType === 'REGULAR' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Normal</button><button onClick={() => setLessonType('MAKEUP')} className={`p-2 rounded-xl border text-xs font-bold ${lessonType === 'MAKEUP' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Telafi</button><button onClick={() => setLessonType('TRIAL')} className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center ${lessonType === 'TRIAL' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Deneme</button></div>
        </div>
      </Dialog>

      <Dialog isOpen={isSlotOptionsOpen} onClose={() => setIsSlotOptionsOpen(false)} title="İşlemler">
        <div className="flex flex-col gap-2 pt-1">{activeSlot?.studentId && (<button onClick={() => { if(activeSlot) actions.cancelSlot(selectedDay, activeSlot.id); setIsSlotOptionsOpen(false); }} className="p-3 rounded-xl bg-orange-50 text-orange-700 font-bold text-sm flex items-center gap-2"><UserX size={16}/> Dersi İptal Et</button>)}<button onClick={() => { if(activeSlot) actions.deleteSlot(selectedDay, activeSlot.id); setIsSlotOptionsOpen(false); }} className="p-3 rounded-xl bg-red-50 text-red-700 font-bold text-sm flex items-center gap-2"><Trash2 size={16}/> Saati Sil</button></div>
      </Dialog>
    </div>
  );
};
