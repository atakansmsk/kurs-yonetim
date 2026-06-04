
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, CourseContextType, LessonSlot, Student, Transaction, Resource, WeekDay, DAYS } from '../types';
import { useAuth } from './AuthContext';
import { DataService } from '../services/api';

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  schoolName: "Sanat Okulu",
  schoolIcon: "sparkles",
  themeColor: "indigo",
  currentTeacher: "Eğitmen",
  teachers: ["Eğitmen"],
  students: {},
  schedule: {},
  updatedAt: new Date(0).toISOString(),
  autoLessonProcessing: true,
  processedSlots: {}
};

const sanitize = (data: any): any => {
    return JSON.parse(JSON.stringify(data, (key, value) => value === undefined ? null : value));
};

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const isFirstSync = useRef(true);
  const lastSavedAt = useRef<string>("");
  const lastLocalUpdateAt = useRef<string>("");

  // 1. VERİ YÜKLEME VE ABONELİK
  useEffect(() => {
    if (!user) { 
      setState(INITIAL_STATE); 
      setIsLoaded(true); 
      isFirstSync.current = true;
      lastLocalUpdateAt.current = "";
      return; 
    }
    
    const findBestBackup = () => {
        const keys = Object.keys(localStorage).filter(k => k.includes(user.id));
        let bestData: AppState | null = null;
        let maxStudents = -1;

        keys.forEach(k => {
            try {
                const d = JSON.parse(localStorage.getItem(k) || "");
                const studentCount = Object.keys(d.students || {}).length;
                if (studentCount > maxStudents) {
                    maxStudents = studentCount;
                    bestData = d;
                }
            } catch(e) {}
        });
        return bestData;
    };

    const localBest = findBestBackup();

    const unsubscribe = DataService.subscribeToUserData(
        user.id,
        (newData) => {
            let finalData = { ...newData };
            
            const remoteStudentCount = Object.keys(finalData.students || {}).length;
            const localStudentCount = Object.keys(localBest?.students || {}).length;

            // Eğer gelen veri boşsa ama yerelde veri varsa kurtar (Sadece ilk senkronizasyonda)
            if (isFirstSync.current) {
                if (remoteStudentCount === 0 && localStudentCount > 0) {
                    finalData = localBest as AppState;
                    setIsRecovered(true);
                }
                isFirstSync.current = false;
            } else {
                // KRİTİK: Eğer gelen veri bizim yerel güncel verimizden daha eskiyse ve yerel verimiz boş değilse kabul etme
                if (lastLocalUpdateAt.current && finalData.updatedAt && finalData.updatedAt < lastLocalUpdateAt.current && remoteStudentCount > 0) {
                    console.log("Sync: Gelen veri yerel veriden eski, reddedildi.");
                    return;
                }
                setIsRecovered(false);
            }

            if (!finalData.students) finalData.students = {};
            if (!finalData.teachers || finalData.teachers.length === 0) finalData.teachers = ["Eğitmen"];
            if (!finalData.currentTeacher) finalData.currentTeacher = finalData.teachers[0];
            if (!finalData.schedule) finalData.schedule = {};
            if (!finalData.processedSlots) finalData.processedSlots = {};

            setState(finalData);
            setIsLoaded(true);
        },
        (error) => { 
            if (localBest && isFirstSync.current) {
                setState(localBest);
                setIsRecovered(true);
            }
            setIsLoaded(true); 
        }
    );
    return () => unsubscribe();
  }, [user]);

  // 2. VERİ KAYDETME (Persistent Sync)
  useEffect(() => {
    if (!isLoaded || !user || state.updatedAt === new Date(0).toISOString()) return;
    
    // Sadece state değiştiğinde ve state gerçekten yüklendiğinde kaydet
    // debounce ekleyerek peş peşe kayıtları azaltıyoruz
    const timeout = setTimeout(() => {
        if (state.updatedAt !== lastSavedAt.current) {
            lastSavedAt.current = state.updatedAt;
            DataService.saveUserData(user.id, sanitize(state))
                .catch(err => console.error("Bulut kaydı başarısız, yerel yedek devrede.", err));
            localStorage.setItem(`kurs_data_backup_${user.id}`, JSON.stringify(state));
        }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [state, isLoaded, user]);

  // 3. OTOMATİK DERS İŞLEME (Optimized)
  useEffect(() => {
    if (!isLoaded || !state.autoLessonProcessing || !user) return;

    const processInterval = setInterval(() => {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const jsDayToAppKey: Record<number, WeekDay> = {
        0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt"
      };
      const currentDayName = jsDayToAppKey[now.getDay()];
      
      const processedToday = state.processedSlots?.[todayDateStr] || [];

      let hasChanges = false;
      let nextProcessedToday = [...processedToday];
      let nextStudents = { ...state.students };

      state.teachers.forEach(teacher => {
        const teacherKey = `${teacher}|${currentDayName}`;
        const teacherSlots = state.schedule[teacherKey] || [];

        teacherSlots.forEach(slot => {
          if (slot.studentId && !nextProcessedToday.includes(slot.id)) {
            const slotStartMinutes = timeToMinutes(slot.start);
            const slotEndMinutes = timeToMinutes(slot.end);
            const duration = slotEndMinutes - slotStartMinutes;
            const isHalfLesson = duration <= 25;
            const lessonCount = isHalfLesson ? 0.5 : 1.0;
            
            // Ders başlama saatinden 5 dakika sonra borç yazalım (Hatalı yazımı önlemek için tampon süre)
            if (currentMinutes >= slotStartMinutes + 5) {
              const student = nextStudents[slot.studentId];
              if (student && student.isActive !== false) {
                const txId = Math.random().toString(36).substr(2, 9);
                const isMakeup = slot.label === 'MAKEUP';
                const isTrial = slot.label === 'TRIAL';
                
                const noteType = isMakeup ? 'Telafi Dersi' : isTrial ? 'Deneme Dersi' : 'Otomatik Ders';
                const note = isHalfLesson ? `Yarım ${noteType} İşlendi (20 dk)` : `${noteType} İşlendi`;
                
                const newTx: Transaction = {
                  id: txId,
                  note,
                  date: now.toISOString(),
                  isDebt: true,
                  amount: 0,
                  lessonCount
                };

                nextStudents[slot.studentId] = {
                  ...student,
                  history: [newTx, ...(student.history || [])]
                };
                
                nextProcessedToday.push(slot.id);
                hasChanges = true;
              }
            }
          }
        });
      });

      if (hasChanges) {
        updateState(s => ({
          ...s,
          students: nextStudents,
          processedSlots: { ...s.processedSlots, [todayDateStr]: nextProcessedToday }
        }));
      }
    }, 60000); // 30 saniye yerine 1 dakikada bir kontrol yeterli ve daha stabil

    return () => clearInterval(processInterval);
  }, [isLoaded, state.autoLessonProcessing, state.teachers, state.schedule, state.processedSlots, state.students, user]);

  const updateState = (updater: (prev: AppState) => AppState) => {
      const now = new Date().toISOString();
      lastLocalUpdateAt.current = now;
      setState(current => {
          const newState = updater(current);
          return { ...newState, updatedAt: now };
      });
  };

  const actions: CourseContextType['actions'] = {
      updateSchoolName: (name) => updateState(s => ({ ...s, schoolName: name || "" })),
      updateSchoolIcon: (icon) => updateState(s => ({ ...s, schoolIcon: icon || "sparkles" })),
      updateThemeColor: (color) => updateState(s => ({ ...s, themeColor: color || "indigo" })),
      addTeacher: (name) => updateState(s => {
          if (s.teachers.includes(name)) return s;
          return { ...s, teachers: [...s.teachers, name], currentTeacher: s.currentTeacher || name };
      }),
      switchTeacher: (name) => updateState(s => ({ ...s, currentTeacher: name })),
      addStudent: (name, phone, fee, registrationDate, color) => {
          const id = Math.random().toString(36).substr(2, 9);
          const newStudent: Student = {
              id, name: name.trim(), phone: phone.trim(), fee: Number(fee) || 0, 
              registrationDate: registrationDate ? new Date(registrationDate).toISOString() : new Date().toISOString(),
              debtLessonCount: 0, makeupCredit: 0, history: [], resources: [], color: color || 'indigo', nextLessonNote: "", isActive: true
          };
          updateState(s => ({ ...s, students: { ...s.students, [id]: newStudent } }));
          return id;
      },
      updateStudent: (id, name, phone, fee, color, nextLessonNote) => updateState(s => {
          const student = s.students[id];
          if (!student) return s;
          return { ...s, students: { ...s.students, [id]: { ...student, name: name.trim(), phone: phone.trim(), fee: Number(fee) || 0, color: color || student.color, nextLessonNote: nextLessonNote ?? student.nextLessonNote } } };
      }),
      toggleStudentStatus: (id, isActive) => updateState(s => {
          if (!s.students[id]) return s;
          return { ...s, students: { ...s.students, [id]: { ...s.students[id], isActive } } };
      }),
      deleteStudent: (id) => updateState(s => {
          const { [id]: deleted, ...restStudents } = s.students;
          const newSchedule = { ...s.schedule };
          Object.keys(newSchedule).forEach(key => {
              newSchedule[key] = (newSchedule[key] || []).map(slot => 
                  slot.studentId === id ? { ...slot, studentId: null, label: null as any } : slot
              );
          });
          return { ...s, students: restStudents, schedule: newSchedule };
      }),
      getStudent: (id) => state.students[id],
      addSlot: (day, start, end) => updateState(s => {
          const key = `${s.currentTeacher}|${day}`;
          const newSlot: LessonSlot = { id: Math.random().toString(36).substr(2, 9), start, end, studentId: null };
          return { ...s, schedule: { ...s.schedule, [key]: [...(s.schedule[key] || []), newSlot] } };
      }),
      deleteSlot: (day, slotId) => updateState(s => {
          const key = `${s.currentTeacher}|${day}`;
          return { ...s, schedule: { ...s.schedule, [key]: (s.schedule[key] || []).filter(slot => slot.id !== slotId) } };
      }),
      bookSlot: (day, slotId, studentId, label) => updateState(s => {
          const key = `${s.currentTeacher}|${day}`;
          return { ...s, schedule: { ...s.schedule, [key]: (s.schedule[key] || []).map(slot => slot.id === slotId ? { ...slot, studentId, label: label || null as any } : slot) } };
      }),
      cancelSlot: (day, slotId) => updateState(s => {
          const key = `${s.currentTeacher}|${day}`;
          return { ...s, schedule: { ...s.schedule, [key]: (s.schedule[key] || []).map(slot => slot.id === slotId ? { ...slot, studentId: null, label: null as any } : slot) } };
      }),
      extendSlot: (day, slotId, minutes) => updateState(s => {
        const key = `${s.currentTeacher}|${day}`;
        return { 
          ...s, 
          schedule: { 
            ...s.schedule, 
            [key]: (s.schedule[key] || []).map(slot => 
              slot.id === slotId ? { ...slot, end: minutesToTime(timeToMinutes(slot.end) + minutes) } : slot
            ) 
          } 
        };
      }),
       addTransaction: (studentId, type, customDate, amount, lessonCount) => updateState(s => {
          const student = s.students[studentId];
          if (!student) return s;
          const date = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
          const isDebt = type === 'LESSON';
          const finalAmount = isDebt ? 0 : (amount !== undefined ? amount : student.fee);
          const newTx: Transaction = { 
              id: Math.random().toString(36).substr(2, 9), 
              note: isDebt ? (lessonCount === 0.5 ? 'Yarım Ders İşlendi (20 dk)' : 'Ders İşlendi') : 'Ödeme Alındı', 
              date, 
              isDebt, 
              amount: finalAmount,
              lessonCount: isDebt ? (lessonCount !== undefined ? lessonCount : 1) : undefined
          };
          return { ...s, students: { ...s.students, [studentId]: { ...student, history: [newTx, ...(student.history || [])] } } };
      }),
      updateTransaction: (studentId, transactionId, note, customDate, lessonCount) => updateState(s => {
          const student = s.students[studentId];
          if (!student) return s;
          const updatedHistory = (student.history || []).map(tx => 
              tx.id === transactionId 
                  ? { 
                      ...tx, 
                      note, 
                      date: customDate ? new Date(customDate).toISOString() : tx.date,
                      lessonCount: tx.isDebt ? (lessonCount !== undefined ? lessonCount : tx.lessonCount) : undefined
                    } 
                  : tx
          );
          return { ...s, students: { ...s.students, [studentId]: { ...student, history: updatedHistory } } };
      }),
      deleteTransaction: (studentId, transactionId) => updateState(s => {
          const st = s.students[studentId];
          if (!st) return s;
          return { ...s, students: { ...s.students, [studentId]: { ...st, history: (st.history || []).filter(t => t.id !== transactionId) } } };
      }),
      toggleAutoProcessing: () => updateState(s => ({ ...s, autoLessonProcessing: !s.autoLessonProcessing })),
      moveSlot: (fromDay, fromSlotId, toDay, toSlotId) => updateState(s => {
        const fromKey = `${s.currentTeacher}|${fromDay}`;
        const toKey = `${s.currentTeacher}|${toDay}`;
        
        const fromSlots = s.schedule[fromKey] || [];
        const toSlots = s.schedule[toKey] || [];
        
        const fromSlot = fromSlots.find(sl => sl.id === fromSlotId);
        const toSlot = toSlots.find(sl => sl.id === toSlotId);
        
        if (!fromSlot || !toSlot) return s;
        
        // Move booking from 'from' to 'to'
        const studentId = fromSlot.studentId;
        const label = fromSlot.label;
        
        const updatedFromSlots = fromSlots.map(sl => sl.id === fromSlotId ? { ...sl, studentId: null, label: null as any } : sl);
        
        const newSchedule = { ...s.schedule };
        newSchedule[fromKey] = updatedFromSlots;
        
        // If they are on the same day, use the already updated array
        const currentToSlots = (fromKey === toKey) ? updatedFromSlots : toSlots;
        const updatedToSlots = currentToSlots.map(sl => sl.id === toSlotId ? { ...sl, studentId, label } : sl);
        
        newSchedule[toKey] = updatedToSlots;
        
        return { ...s, schedule: newSchedule };
      }),
      moveStudent: (studentId, fromDay, fromSlotId, toDay, newStart) => updateState(s => {
        const oldKey = `${s.currentTeacher}|${fromDay}`;
        const newKey = `${s.currentTeacher}|${toDay}`;
        const oldSlots = s.schedule[oldKey] || [];
        const oldSlot = oldSlots.find(sl => sl.id === fromSlotId);
        const updatedOldSlots = oldSlots.map(slot => slot.id === fromSlotId ? { ...slot, studentId: null, label: null as any } : slot);
        
        const newSchedule = { ...s.schedule };
        newSchedule[oldKey] = updatedOldSlots;
        
        let newSlots = [...(newSchedule[newKey] || [])];
        const targetIdx = newSlots.findIndex(slot => slot.start === newStart);
        
        if (targetIdx > -1) {
            newSlots[targetIdx] = { ...newSlots[targetIdx], studentId, label: oldSlot?.label as any };
        } else {
            const h = parseInt(newStart.split(':')[0]);
            const m = parseInt(newStart.split(':')[1]);
            const duration = 40; // Default duration
            const endM = (h * 60 + m + duration);
            const endT = `${Math.floor(endM/60).toString().padStart(2,'0')}:${(endM%60).toString().padStart(2,'0')}`;
            const newSlot: LessonSlot = { id: Math.random().toString(36).substr(2, 9), start: newStart, end: endT, studentId, label: oldSlot?.label as any };
            newSlots.push(newSlot);
            newSlots.sort((a, b) => a.start.localeCompare(b.start));
        }
        
        newSchedule[newKey] = newSlots;
        return { ...s, schedule: newSchedule };
      }),
      swapSlots: (dayA, slotIdA, dayB, slotIdB) => updateState(s => {
        const keyA = `${s.currentTeacher}|${dayA}`;
        const keyB = `${s.currentTeacher}|${dayB}`;
        
        const slotsA = s.schedule[keyA] || [];
        const slotsB = s.schedule[keyB] || [];
        
        const slotA = slotsA.find(sl => sl.id === slotIdA);
        const slotB = slotsB.find(sl => sl.id === slotIdB);
        
        if (!slotA || !slotB) return s;
        
        const studentA = slotA.studentId;
        const labelA = slotA.label;
        const studentB = slotB.studentId;
        const labelB = slotB.label;
        
        const newSchedule = { ...s.schedule };
        
        if (keyA === keyB) {
            newSchedule[keyA] = slotsA.map(sl => {
                if (sl.id === slotIdA) return { ...sl, studentId: studentB, label: labelB };
                if (sl.id === slotIdB) return { ...sl, studentId: studentA, label: labelA };
                return sl;
            });
        } else {
            newSchedule[keyA] = slotsA.map(sl => sl.id === slotIdA ? { ...sl, studentId: studentB, label: labelB } : sl);
            newSchedule[keyB] = slotsB.map(sl => sl.id === slotIdB ? { ...sl, studentId: studentA, label: labelA } : sl);
        }
        
        return { ...s, schedule: newSchedule };
      }),
      addResource: (studentId, title, url, type) => updateState(s => {
          const st = s.students[studentId];
          if(!st) return s;
          const newRes: Resource = { id: Math.random().toString(36).substr(2,9), title: title || "Belge", url, type, date: new Date().toISOString() };
          return { ...s, students: { ...s.students, [studentId]: { ...st, resources: [newRes, ...(st.resources || [])] } } };
      }),
      deleteResource: (studentId, resourceId) => updateState(s => {
          const st = s.students[studentId];
          if(!st) return s;
          return { ...s, students: { ...s.students, [studentId]: { ...st, resources: (st.resources || []).filter(r => r.id !== resourceId) } } };
      }),
      clearDay: (day) => updateState(s => {
           const key = `${s.currentTeacher}|${day}`;
           return { ...s, schedule: { ...s.schedule, [key]: [] } };
      }),
      forceSync: async () => {
          if (user) {
              await DataService.saveUserData(user.id, sanitize(state));
              setIsRecovered(false);
          }
      }
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-bold tracking-widest uppercase text-[10px]">YÜKLENİYOR...</div>;
  return <CourseContext.Provider value={{ state, isRecovered, actions }}>{children}</CourseContext.Provider>;
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) throw new Error('useCourse error');
  return context;
};
