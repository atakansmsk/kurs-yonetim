import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, CourseContextType, LessonSlot, Student, Transaction, Resource, WeekDay, DAYS } from '../types';
import { useAuth } from './AuthContext';
import { DataService } from '../services/api';

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  schoolName: "Sanat Okulu",
  schoolIcon: "sparkles",
  themeColor: "indigo",
  currentTeacher: "",
  teachers: [],
  students: {},
  schedule: {},
  updatedAt: new Date(0).toISOString(),
  autoLessonProcessing: true
};

const THEMES: Record<string, Record<string, string>> = {
  indigo: { '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81' },
  blue: { '50': '#f0f9ff', '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc', '400': '#38bdf8', '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1', '800': '#075985', '900': '#0c4a6e' },
  emerald: { '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7', '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b' },
  rose: { '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af', '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337' },
  amber: { '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d', '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f' },
  neutral: { '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1', '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155', '800': '#1e293b', '900': '#0f172a' }
};

const parseCurrency = (val: string | number): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let clean = val.toString().replace(/\s/g, '');
    if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
    else clean = clean.replace(/\./g, '');
    const result = parseFloat(clean);
    return isNaN(result) ? 0 : result;
};

const getTodayName = (): WeekDay => {
  const map: Record<number, WeekDay> = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cmt" };
  return map[new Date().getDay()];
};

const calculateNextLessonNumber = (history: Transaction[]): number => {
    const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let count = 0;
    for (const tx of sorted) {
        if (!tx.isDebt) break;
        if (tx.isDebt) {
            const lowerNote = tx.note.toLowerCase();
            if (!lowerNote.includes('iptal') && !lowerNote.includes('gelmedi') && !lowerNote.includes('telafi')) count++;
        }
    }
    return count + 1;
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

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const processingRef = useRef(false);
  
  // SİLİNEN DERSLERİN TEKRAR EKLENMESİNİ ÖNLEMEK İÇİN (Local Guard)
  // Format: "studentId|dateString"
  const [deletedToday, setDeletedToday] = useState<Set<string>>(new Set());

  const checkAndProcessLessons = (currentState: AppState): AppState | null => {
      if (!currentState.autoLessonProcessing) return null;
      const now = new Date();
      const todayName = getTodayName();
      const dateKey = now.toISOString().split('T')[0];
      let newState = { ...currentState };
      let changesFound = false;

      const relevantKeys = Object.keys(newState.schedule).filter(k => k.endsWith(`|${todayName}`));

      relevantKeys.forEach(key => {
          const slots = newState.schedule[key];
          slots.forEach(slot => {
              if (!slot.studentId) return;
              
              // EĞER BU ÖĞRENCİNİN DERSİ BUGÜN MANUEL SİLİNDİYSE OTOMATİK EKLEME
              if (deletedToday.has(`${slot.studentId}|${dateKey}`)) return;

              const [h, m] = slot.end.split(':').map(Number);
              const lessonEnd = new Date();
              lessonEnd.setHours(h, m, 0, 0);

              if (lessonEnd < now) {
                  const student = newState.students[slot.studentId];
                  if (!student || student.isActive === false) return;

                  const history = student.history || [];
                  const hasTx = history.some(tx => {
                      if (!tx.isDebt) return false;
                      const txDate = new Date(tx.date);
                      return txDate.getDate() === now.getDate() && 
                             txDate.getMonth() === now.getMonth() && 
                             txDate.getFullYear() === now.getFullYear();
                  });

                  if (!hasTx) {
                       changesFound = true;
                       let note = "";
                       const nextNum = calculateNextLessonNumber(history);
                       if (slot.label === 'MAKEUP') note = `Telafi Dersi (Tamamlandı)`;
                       else if (slot.label === 'TRIAL') note = `Deneme Dersi (Tamamlandı)`;
                       else note = `${nextNum}. Ders İşlendi`;

                       const newTx: Transaction = {
                          id: Math.random().toString(36).substr(2, 9),
                          note,
                          date: lessonEnd.toISOString(),
                          isDebt: true,
                          amount: 0
                       };

                       newState = {
                           ...newState,
                           students: {
                               ...newState.students,
                               [student.id]: {
                                   ...student,
                                   debtLessonCount: nextNum,
                                   history: [newTx, ...history],
                                   nextLessonNote: student.nextLessonNote || "" 
                               }
                           }
                       };
                  }
              }
          });
      });
      return changesFound ? newState : null;
  };

  useEffect(() => {
    if (!user) { setState(INITIAL_STATE); setIsLoaded(true); return; }
    const timer = setTimeout(() => setIsLoaded(true), 500);
    const unsubscribe = DataService.subscribeToUserData(
        user.id,
        (newData) => {
            clearTimeout(timer);
            const processedState = checkAndProcessLessons(newData);
            const finalState = processedState || newData;
            if (processedState) DataService.saveUserData(user.id, finalState).catch(console.error);
            setState(finalState);
            setIsLoaded(true);
        },
        (error) => { console.error("Sync Error", error); setIsLoaded(true); }
    );
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [user]);

  useEffect(() => {
      if (!isLoaded || !state.autoLessonProcessing || !user) return;
      const interval = setInterval(() => {
          if (processingRef.current) return;
          processingRef.current = true;
          const processedState = checkAndProcessLessons(state);
          if (processedState) {
              setState(processedState);
              DataService.saveUserData(user.id, processedState)
                  .catch(console.error)
                  .finally(() => { processingRef.current = false; });
          } else {
              processingRef.current = false;
          }
      }, 60000);
      return () => clearInterval(interval);
  }, [isLoaded, state, user, deletedToday]);

  const updateState = (updater: (prev: AppState) => AppState) => {
      setState(current => {
          const newState = updater(current);
          newState.updatedAt = new Date().toISOString();
          if (user) {
              // Firestore undefined hatasını önlemek için derin temizlik
              const sanitized = JSON.parse(JSON.stringify(newState));
              DataService.saveUserData(user.id, sanitized).catch(err => console.error("SAVE ERROR:", err));
          }
          return newState;
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
              id, name: name.trim(), phone: phone.trim(), fee: parseCurrency(fee), 
              registrationDate: registrationDate ? new Date(registrationDate).toISOString() : new Date().toISOString(),
              debtLessonCount: 0, makeupCredit: 0, history: [], resources: [], color: color || 'indigo', nextLessonNote: "", isActive: true
          };
          updateState(s => ({ ...s, students: { ...s.students, [id]: newStudent } }));
          return id;
      },
      updateStudent: (id, name, phone, fee, color, nextLessonNote) => updateState(s => {
          const student = s.students[id];
          if (!student) return s;
          return { ...s, students: { ...s.students, [id]: { ...student, name: name.trim(), phone: phone.trim(), fee: parseCurrency(fee), color: color || student.color, nextLessonNote: nextLessonNote ?? student.nextLessonNote } } };
      }),
      toggleStudentStatus: (id, isActive) => updateState(s => {
          if (!s.students[id]) return s;
          return { ...s, students: { ...s.students, [id]: { ...s.students[id], isActive } } };
      }),
      deleteStudent: (id) => updateState(s => {
          const { [id]: deleted, ...rest } = s.students;
          return { ...s, students: rest };
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
      addTransaction: (studentId, type, customDate, amount) => updateState(s => {
          const student = s.students[studentId];
          if (!student) return s;
          const date = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
          const isDebt = type === 'LESSON';
          const nextNum = calculateNextLessonNumber(student.history || []);
          const newTx: Transaction = { id: Math.random().toString(36).substr(2, 9), note: isDebt ? `${nextNum}. Ders İşlendi` : 'Ödeme Alındı', date, isDebt, amount: isDebt ? 0 : (amount ?? student.fee) };
          return { ...s, students: { ...s.students, [studentId]: { ...student, history: [newTx, ...(student.history || [])], debtLessonCount: isDebt ? nextNum : 0 } } };
      }),
      updateTransaction: (studentId, transactionId, note, customDate) => updateState(s => {
          const student = s.students[studentId];
          if (!student) return s;
          const updatedHistory = (student.history || []).map(tx => tx.id === transactionId ? { ...tx, note, date: customDate ? new Date(customDate).toISOString() : tx.date } : tx);
          return { ...s, students: { ...s.students, [studentId]: { ...student, history: updatedHistory } } };
      }),
      deleteTransaction: (studentId, transactionId) => {
          // Önce hangi tarihteki ders siliniyor bulalım (Otomatik eklemeyi önlemek için)
          const student = state.students[studentId];
          const tx = student?.history?.find(t => t.id === transactionId);
          if (tx && tx.isDebt) {
              const txDate = tx.date.split('T')[0];
              setDeletedToday(prev => new Set(prev).add(`${studentId}|${txDate}`));
          }
          
          updateState(s => {
              const st = s.students[studentId];
              if (!st) return s;
              const filtered = (st.history || []).filter(t => t.id !== transactionId);
              return { ...s, students: { ...s.students, [studentId]: { ...st, history: filtered, debtLessonCount: Math.max(0, st.debtLessonCount - 1) } } };
          });
      },
      toggleAutoProcessing: () => updateState(s => ({ ...s, autoLessonProcessing: !s.autoLessonProcessing })),
      moveSlot: (fD, fS, tD, tS) => {},
      moveStudent: (studentId, fromDay, fromSlotId, toDay, newStart) => updateState(s => {
        const oldKey = `${s.currentTeacher}|${fromDay}`;
        const newKey = `${s.currentTeacher}|${toDay}`;
        const oldSlot = (s.schedule[oldKey] || []).find(sl => sl.id === fromSlotId);
        const updatedOldSlots = (s.schedule[oldKey] || []).map(slot => slot.id === fromSlotId ? { ...slot, studentId: null, label: null as any } : slot);
        let newSlots = [...(s.schedule[newKey] || [])];
        const targetIdx = newSlots.findIndex(slot => slot.start === newStart);
        if (targetIdx > -1) {
            newSlots[targetIdx] = { ...newSlots[targetIdx], studentId, label: oldSlot?.label as any };
        } else {
            const newSlot: LessonSlot = { id: Math.random().toString(36).substr(2, 9), start: newStart, end: minutesToTime(timeToMinutes(newStart) + 40), studentId, label: oldSlot?.label as any };
            newSlots.push(newSlot);
            newSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
        }
        return { ...s, schedule: { ...s.schedule, [oldKey]: updatedOldSlots, [newKey]: newSlots } };
      }),
      swapSlots: (dA, sA, dB, sB) => {},
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
      })
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-bold">Veriler Senkronize Ediliyor...</div>;

  return <CourseContext.Provider value={{ state, actions }}>{children}</CourseContext.Provider>;
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) throw new Error('useCourse must be used within a CourseProvider');
  return context;
};