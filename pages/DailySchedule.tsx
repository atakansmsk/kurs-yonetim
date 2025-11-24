

import React, { useState, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { DAYS, WeekDay, LessonSlot, Student } from '../types';
import { Plus, ChevronRight, Trash2, UserX, MoreHorizontal, CalendarDays, ArrowRight, Clock, Moon, Repeat, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface DailyScheduleProps {
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

const WORK_END_TIME = "21:00";
const WORK_END_MINUTES = 21 * 60;

export const DailySchedule: React.FC<DailyScheduleProps> = ({ onOpenStudentProfile }) => {
  const { state, actions } = useCourse();
  const [selectedDay, setSelectedDay] = useState<WeekDay>("Pazartesi");
  
  // Modals state
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSlotOptionsOpen, setIsSlotOptionsOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<LessonSlot | null>(null);

  // Form state
  const [newTimeStart, setNewTimeStart] = useState("12:00");
  const [newTimeEnd, setNewTimeEnd] = useState("12:50");
  const [duration, setDuration] = useState(50); // Default 50 mins
  
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookFee, setBookFee] = useState("");
  const [existingStudentId, setExistingStudentId] = useState<string | null>(null);
  
  // New: Makeup Toggle
  const [isMakeupBook, setIsMakeupBook] = useState(false);

  const rawSlots = state.schedule[`${state.currentTeacher}|${selectedDay}`] || [];
  const slots = [...rawSlots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  // Recalculate end time when duration changes
  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    const startMins = timeToMinutes(newTimeStart);
    setNewTimeEnd(minutesToTime(startMins + mins));
  };

  // Recalculate end time when start time changes
  const handleStartTimeChange = (val: string) => {
    setNewTimeStart(val);
    const startMins = timeToMinutes(val);
    setNewTimeEnd(minutesToTime(startMins + duration));
  };

  const handleBookStudent = () => {
    if (!activeSlot) return;
    let studentId = existingStudentId;
    if (!studentId && bookName) {
      studentId = actions.addStudent(bookName, bookPhone, parseFloat(bookFee) || 0);
    }
    if (studentId) {
      actions.bookSlot(selectedDay, activeSlot.id, studentId, isMakeupBook ? 'MAKEUP' : 'REGULAR');
      setIsBookModalOpen(false);
      resetBookForm();
    }
  };

  const resetBookForm = () => {
    setBookName(""); setBookPhone(""); setBookFee(""); setExistingStudentId(null); setIsMakeupBook(false);
  };

  const openAddSlotModal = (start?: string, end?: string) => {
    if (start) {
        setNewTimeStart(start);
        if (end) {
            setNewTimeEnd(end);
            const diff = timeToMinutes(end) - timeToMinutes(start);
            setDuration(diff > 0 ? diff : 50);
        } else {
            const startMins = timeToMinutes(start);
            setNewTimeEnd(minutesToTime(startMins + 50));
            setDuration(50);
        }
    }
    setIsTimeModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Compact Day Selector */}
      <div className="bg-white/90 backdrop-blur-md pt-2 pb-2 px-2 z-20 sticky top-0 border-b border-slate-100 shadow-sm">
        <div className="flex justify-between items-center bg-slate-50 p-1 rounded-xl">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 text-center ${
                selectedDay === day ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {SHORT_DAYS[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-scale-in">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-50">
                 <CalendarDays size={28} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-800 font-bold text-lg mb-1">Program Boş</p>
            <p className="text-slate-400 text-xs font-medium mb-6">Bugün için ders kaydı yok.</p>
            <button onClick={() => openAddSlotModal("09:00")} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center gap-2">
                <Plus size={16} /> İlk Saati Ekle
            </button>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Thin Timeline Line */}
            <div className="absolute left-[24px] top-2 bottom-2 w-px bg-slate-100 -z-10"></div>

            {slots.map((slot, idx) => {
              const isOccupied = !!slot.studentId;
              const student = slot.studentId ? state.students[slot.studentId] : null;
              const isMakeup = slot.label === 'MAKEUP';
              
              // Gap Calculation
              let gapElement = null;
              if (idx < slots.length - 1) {
                  const currentEnd = timeToMinutes(slot.end);
                  const nextStart = timeToMinutes(slots[idx + 1].start);
                  const diff = nextStart - currentEnd;
                  
                  if (diff > 0) {
                      gapElement = (
                          <div className="flex items-center gap-3 my-1 animate-in fade-in zoom-in duration-300">
                              <div className="w-[48px] flex justify-center shrink-0"></div>
                              <button 
                                onClick={() => openAddSlotModal(slot.end, slots[idx + 1].start)}
                                className="flex-1 h-6 rounded-lg border border-dashed border-slate-200 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-500 transition-all active:scale-95"
                              >
                                  <span>+{diff} dk Boşluk</span>
                              </button>
                          </div>
                      );
                  }
              }

              return (
                <React.Fragment key={slot.id}>
                    <div className="flex gap-3 group animate-slide-up relative py-1" style={{ animationDelay: `${idx * 0.03}s` }}>
                        {/* Slim Time Column */}
                        <div className="flex flex-col items-center pt-1 shrink-0 w-[48px]">
                            <div className={`w-full py-1 rounded-md flex flex-col items-center justify-center border transition-colors bg-white ${
                                isOccupied ? 'border-slate-100 text-slate-700' : 'border-emerald-100 text-emerald-600'
                            }`}>
                                <span className="text-xs font-bold tracking-tight">{slot.start}</span>
                                <span className="text-[8px] font-medium opacity-60">{slot.end}</span>
                            </div>
                        </div>

                        {/* Compact Slot Card */}
                        <div 
                            onClick={() => isOccupied ? onOpenStudentProfile(slot.studentId!) : ((setActiveSlot(slot), resetBookForm(), setIsBookModalOpen(true)))}
                            className={`flex-1 relative overflow-hidden rounded-xl transition-all duration-200 min-h-[50px] ${
                                isOccupied 
                                ? (isMakeup ? 'bg-orange-50/50 shadow-sm border border-orange-200 active:scale-[0.99]' : 'bg-white shadow-sm border border-slate-100 active:scale-[0.99]')
                                : 'bg-emerald-50/40 border border-emerald-100/50 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer active:scale-[0.99]'
                            }`}
                        >
                            {isOccupied && <div className={`absolute left-0 top-0 bottom-0 w-1 ${isMakeup ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>}

                            <div className="px-3 py-2 flex items-center justify-between gap-2 h-full">
                                {isOccupied ? (
                                    <>
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${isMakeup ? 'bg-orange-500' : 'bg-slate-800'}`}>
                                                {isMakeup ? 'T' : student?.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`font-bold truncate text-sm leading-tight ${isMakeup ? 'text-orange-900' : 'text-slate-700'}`}>{student?.name}</h4>
                                                {isMakeup && <span className="text-[9px] font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-sm">TELAFİ</span>}
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </>
                                ) : (
                                    /* Minimal Available State */
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            <h4 className="font-bold text-emerald-600 text-xs tracking-wide">MÜSAİT</h4>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-white text-emerald-500 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                                            <Plus size={14} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Options Button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveSlot(slot); setIsSlotOptionsOpen(true); }}
                                className={`absolute top-1 right-1 p-1 z-20 transition-colors rounded-md ${isOccupied ? 'text-slate-300 hover:text-slate-500' : 'text-emerald-300 hover:text-emerald-600'}`}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </div>
                    </div>
                    {gapElement}
                </React.Fragment>
              );
            })}

            {/* End of Day Gap */}
            {(() => {
                const lastSlot = slots[slots.length - 1];
                const lastEndMin = timeToMinutes(lastSlot.end);
                if (lastEndMin < WORK_END_MINUTES) {
                    return (
                        <div className="flex gap-3 animate-in fade-in duration-500 pt-1 opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex flex-col items-center shrink-0 w-[48px]">
                                <div className="w-full py-1 text-center text-[9px] font-bold text-slate-400 bg-slate-50 rounded-md border border-dashed border-slate-200">
                                    {lastSlot.end}
                                </div>
                            </div>
                            <button 
                                onClick={() => openAddSlotModal(lastSlot.end)}
                                className="flex-1 border border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all py-2 min-h-[40px]"
                            >
                                <Moon size={12} />
                                <span className="text-[10px] font-bold">Kapanışa kadar boş</span>
                                <Plus size={12} />
                            </button>
                        </div>
                    )
                }
                return null;
            })()}
          </div>
        )}
      </div>

      {/* Compact FAB */}
      <button
        onClick={() => openAddSlotModal()}
        className="fixed bottom-20 right-5 w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-400/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-30 border-2 border-white/10 backdrop-blur-sm"
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {/* IMPROVED Add Time Modal */}
      <Dialog
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        title="Saat Ekle"
        actions={
          <>
            <button onClick={() => setIsTimeModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
            <button onClick={() => { actions.addSlot(selectedDay, newTimeStart, newTimeEnd); setIsTimeModalOpen(false); }} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md shadow-slate-300 active:scale-95">Ekle</button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
            {/* Time Inputs Display */}
            <div className="flex items-center justify-center gap-3">
                 {/* Start Time */}
                 <div className="flex-1">
                    <label className="text-[10px] font-black text-indigo-400 uppercase block mb-1 text-center">BAŞLANGIÇ</label>
                    <div className="relative bg-slate-50 border-2 border-indigo-100 rounded-2xl overflow-hidden">
                        <input 
                            type="time" 
                            value={newTimeStart}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            className="w-full text-3xl font-black text-slate-800 bg-transparent outline-none text-center py-3 z-10 relative"
                        />
                    </div>
                 </div>

                 <div className="pt-5 text-slate-300"><ArrowRight size={24} /></div>

                 {/* End Time */}
                 <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-center">BİTİŞ</label>
                    <div className="relative bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden">
                        <input 
                            type="time" 
                            value={newTimeEnd}
                            onChange={(e) => { setNewTimeEnd(e.target.value); setDuration(0); /* Manual override clears duration preset visual */ }} 
                            className="w-full text-3xl font-black text-slate-800 bg-transparent outline-none text-center py-3" 
                        />
                    </div>
                 </div>
            </div>

            {/* Quick Duration Chips */}
            <div className="flex justify-center gap-2">
                {[20, 40, 50].map(mins => (
                    <button 
                        key={mins}
                        onClick={() => handleDurationChange(mins)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            duration === mins 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                        }`}
                    >
                        {mins} dk
                    </button>
                ))}
            </div>
        </div>
      </Dialog>

      {/* Book Modal */}
      <Dialog
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Ders Kaydı"
        actions={
          <>
            <button onClick={() => setIsBookModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
            <button onClick={handleBookStudent} disabled={!existingStudentId && !bookName} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 active:scale-95 transition-all">Kaydet</button>
          </>
        }
      >
        <div className="space-y-3 pt-1">
          <div>
            <input 
                type="text"
                value={bookName}
                onChange={(e) => {
                   setBookName(e.target.value);
                   const match = (Object.values(state.students) as Student[]).find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                   if(match) { setExistingStudentId(match.id); setBookPhone(match.phone); setBookFee(match.fee.toString()); } else { setExistingStudentId(null); }
                }}
                placeholder="Öğrenci Adı..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                autoFocus
              />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="tel" value={bookPhone} onChange={(e) => setBookPhone(e.target.value)} placeholder="Telefon" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 text-sm" />
            <input type="number" value={bookFee} onChange={(e) => setBookFee(e.target.value)} placeholder="Ücret" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 text-sm" />
          </div>

          {/* Makeup Toggle */}
          <div 
             onClick={() => setIsMakeupBook(!isMakeupBook)}
             className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${isMakeupBook ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
          >
             <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMakeupBook ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Repeat size={16} strokeWidth={2.5} />
                </div>
                <div>
                    <h4 className="font-bold text-sm">Telafi Dersi</h4>
                    <p className="text-[10px] opacity-70 leading-none mt-0.5">{isMakeupBook ? 'Bu ders telafi olarak işlenecek.' : 'Normal program dersi.'}</p>
                </div>
             </div>
             <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isMakeupBook ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300'}`}>
                 {isMakeupBook && <CheckCircle2 size={12} />}
             </div>
          </div>
        </div>
      </Dialog>

      {/* Slot Options */}
      <Dialog isOpen={isSlotOptionsOpen} onClose={() => setIsSlotOptionsOpen(false)} title="İşlemler">
        <div className="flex flex-col gap-2 pt-1">
          {activeSlot?.studentId && (
            <button onClick={() => { if(activeSlot) actions.cancelSlot(selectedDay, activeSlot.id); setIsSlotOptionsOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors w-full text-left border border-orange-100">
              <div className="p-1.5 bg-white rounded-lg text-orange-500 shadow-sm"><UserX size={18} /></div>
              <div><div className="font-bold text-sm">Dersi İptal Et</div></div>
            </button>
          )}
          <button onClick={() => { if(activeSlot) actions.deleteSlot(selectedDay, activeSlot.id); setIsSlotOptionsOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors w-full text-left border border-red-100">
            <div className="p-1.5 bg-white rounded-lg text-red-500 shadow-sm"><Trash2 size={18} /></div>
            <div><div className="font-bold text-sm">Saati Sil</div></div>
          </button>
        </div>
      </Dialog>
    </div>
  );
};
