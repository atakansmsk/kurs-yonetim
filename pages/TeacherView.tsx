
import React, { useEffect, useState, useMemo } from 'react';
import { DataService } from '../services/api';
import { AppState, DAYS, WeekDay } from '../types';
import { CalendarCheck, Clock, Layers, Sparkles, User, RefreshCcw, Star, AlertCircle, XCircle } from 'lucide-react';

interface TeacherViewProps {
  uid: string; // The main account ID (School Owner)
  teacherName: string;
}

const SHORT_DAYS: Record<WeekDay, string> = {
  "Pazartesi": "PZT", "Salı": "SAL", "Çarşamba": "ÇAR", "Perşembe": "PER", "Cuma": "CUM", "Cmt": "CMT", "Pazar": "PAZ"
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const TeacherView: React.FC<TeacherViewProps> = ({ uid, teacherName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    // Real-time subscription to catch updates immediately
    const unsubscribe = DataService.subscribeToUserData(
        uid,
        (data) => {
            setState(data);
            setLoading(false);
        },
        (err) => {
            console.error(err);
            setError("Veri yüklenirken hata oluştu.");
            setLoading(false);
        }
    );

    return () => unsubscribe();
  }, [uid]);

  const todayIndex = new Date().getDay(); 
  const jsDayToAppKey: Record<number, WeekDay> = { 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt", 0: "Pazar" };
  const currentDayName = jsDayToAppKey[todayIndex];

  // Helper to get slots for this specific teacher
  const getDaySlots = (day: WeekDay) => {
      if (!state) return [];
      const key = `${teacherName}|${day}`;
      return (state.schedule[key] || []).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  };

  const totalStudents = useMemo(() => {
      if (!state) return 0;
      const uniqueStudents = new Set<string>();
      DAYS.forEach(day => {
          const key = `${teacherName}|${day}`;
          (state.schedule[key] || []).forEach(s => {
              if (s.studentId) uniqueStudents.add(s.studentId);
          });
      });
      return uniqueStudents.size;
  }, [state, teacherName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-sm tracking-wide">Program Yükleniyor...</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <XCircle size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-800">Erişim Hatası</h3>
        <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium">{error || "Kurum verisine ulaşılamadı."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
        
        {/* Header */}
        <div className="bg-white px-5 pt-6 pb-4 border-b border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] sticky top-0 z-30 animate-slide-up">
             <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-slate-200">
                     {teacherName.charAt(0).toUpperCase()}
                 </div>
                 <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{state.schoolName}</p>
                     <h1 className="text-xl font-black text-slate-900 leading-none">{teacherName}</h1>
                     <div className="flex items-center gap-1.5 mt-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         <span className="text-xs font-bold text-emerald-600">Canlı Program</span>
                         <span className="text-[10px] font-bold text-slate-300 ml-2">({totalStudents} Öğrenci)</span>
                     </div>
                 </div>
             </div>
        </div>

        {/* Weekly Grid */}
        <div className="flex-1 overflow-y-auto p-2 pb-10">
            <div className="grid gap-1 content-start h-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
                {DAYS.map((day) => {
                    const isToday = day === currentDayName;
                    const slots = getDaySlots(day);
                    
                    return (
                        <div key={day} className={`flex flex-col min-w-0 rounded-xl border transition-all duration-300 ${isToday ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50 z-10' : 'bg-white border-slate-100 shadow-sm'}`}>
                            
                            {/* Day Header */}
                            <div className={`text-center py-2 border-b ${isToday ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50/50 border-slate-50'}`}>
                                <span className={`block font-black uppercase tracking-wider text-xs ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>
                                    {day}
                                </span>
                            </div>

                            {/* Slots */}
                            <div className="flex flex-col p-1.5 gap-1.5 min-h-[100px]">
                                {slots.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center opacity-30">
                                        <span className="text-[10px] font-bold text-slate-300">- Boş -</span>
                                    </div>
                                ) : (
                                    slots.map((slot) => {
                                        const isOccupied = !!slot.studentId;
                                        const student = isOccupied ? state.students[slot.studentId!] : null;
                                        const isMakeup = slot.label === 'MAKEUP';
                                        const isTrial = slot.label === 'TRIAL';
                                        
                                        if (!isOccupied) return (
                                            <div key={slot.id} className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-between opacity-60">
                                                 <span className="text-[10px] font-bold text-slate-400">{slot.start}</span>
                                                 <span className="text-[9px] font-bold text-slate-300">MÜSAİT</span>
                                            </div>
                                        );

                                        return (
                                            <div 
                                                key={slot.id}
                                                className={`
                                                    relative flex items-center gap-2 p-2 rounded-lg border shadow-sm transition-all
                                                    ${isMakeup ? 'bg-orange-50 border-orange-100' : isTrial ? 'bg-purple-50 border-purple-100' : 'bg-white border-slate-100'}
                                                `}
                                            >
                                                <div className="flex flex-col items-center justify-center px-1.5 py-0.5 bg-white/50 rounded border border-black/5 min-w-[36px]">
                                                    <span className="text-[10px] font-black text-slate-700 leading-none">{slot.start}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 leading-none mt-0.5">{slot.end}</span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 text-xs truncate leading-tight">
                                                        {student?.name || "İsimsiz"}
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        {isMakeup && <span className="text-[8px] font-black text-orange-600 bg-orange-100 px-1 rounded">TELAFİ</span>}
                                                        {isTrial && <span className="text-[8px] font-black text-purple-600 bg-purple-100 px-1 rounded">DENEME</span>}
                                                        {!isMakeup && !isTrial && <span className="text-[8px] font-bold text-slate-400">Ders</span>}
                                                    </div>
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
        
        <div className="bg-white p-3 text-center border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium">Bu liste anlık olarak güncellenmektedir.</p>
        </div>
    </div>
  );
};
