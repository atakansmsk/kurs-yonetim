
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

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);

  useEffect(() => {
    if (!user) { setState(INITIAL_STATE); setIsLoaded(true); return; }
    
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

            if (remoteStudentCount === 0 && localStudentCount > 0) {
                console.warn("Kurtarma Devrede: Yerel yedekten yükleniyor.");
                finalData = localBest as AppState;
                setIsRecovered(true);
            } else {
                setIsRecovered(false);
            }

            if (!finalData.students) finalData.students = {};
            if (!finalData.teachers || finalData.teachers.length === 0) finalData.teachers = ["Eğitmen"];
            if (!finalData.currentTeacher) finalData.currentTeacher = finalData.teachers[0];
            if (!finalData.schedule) finalData.schedule = {};

            setState(finalData);
            setIsLoaded(true);
        },
        (error) => { 
            console.error("Senkronizasyon Hatası:", error);
            if (localBest) {
                setState(localBest);
                setIsRecovered(true);
            }
            setIsLoaded(true); 
        }
    );
    return () => unsubscribe();
  }, [user]);

  const updateState = (updater: (prev: AppState) => AppState) => {
      setState(current => {
          const newState = updater(current);
          newState.updatedAt = new Date().toISOString();
          
          const prevCount = Object.keys(current.students || {}).length;
          const nextCount = Object.keys(newState.students || {}).length;

          if (user) {
              if (prevCount > 0 && nextCount === 0) {
                  console.error("VERİ KAYBI ÖNLENDİ: Boş liste kaydedilmedi.");
              } else {
                  DataService.saveUserData(user.id, sanitize(newState)).catch(err => console.error("Cloud Save Error:", err));
              }
              localStorage.setItem(`kurs_data_backup_${user.id}`, JSON.stringify(newState));
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
          const newTx: Transaction = { id: Math.random().toString(36).substr(2, 9), note: isDebt ? 'Ders İşlendi' : 'Ödeme Alındı', date, isDebt, amount: isDebt ? 0 : (amount ?? student.fee) };
          return { ...s, students: { ...s.students, [studentId]: { ...student, history: [newTx, ...(student.history || [])] } } };
      }),
      updateTransaction: (studentId, transactionId, note, customDate) => updateState(s => {
          const student = s.students[studentId];
          if (!student) return s;
          const updatedHistory = (student.history || []).map(tx => tx.id === transactionId ? { ...tx, note, date: customDate ? new Date(customDate).toISOString() : tx.date } : tx);
          return { ...s, students: { ...s.students, [studentId]: { ...student, history: updatedHistory } } };
      }),
      deleteTransaction: (studentId, transactionId) => updateState(s => {
          const st = s.students[studentId];
          if (!st) return s;
          return { ...s, students: { ...s.students, [studentId]: { ...st, history: (st.history || []).filter(t => t.id !== transactionId) } } };
      }),
      toggleAutoProcessing: () => updateState(s => ({ ...s, autoLessonProcessing: !s.autoLessonProcessing })),
      moveSlot: (fD, fS, tD, tS) => {},
      moveStudent: (studentId, fromDay, fromSlotId, toDay, newStart) => updateState(s => {
        const oldKey = `${s.currentTeacher}|${fromDay}`;
        const newKey = `${s.currentTeacher}|${toDay}`;
        const oldSlots = s.schedule[oldKey] || [];
        const oldSlot = oldSlots.find(sl => sl.id === fromSlotId);
        const updatedOldSlots = oldSlots.map(slot => slot.id === fromSlotId ? { ...slot, studentId: null, label: null as any } : slot);
        let newSlots = [...(s.schedule[newKey] || [])];
        const targetIdx = newSlots.findIndex(slot => slot.start === newStart);
        if (targetIdx > -1) {
            newSlots[targetIdx] = { ...newSlots[targetIdx], studentId, label: oldSlot?.label as any };
        } else {
            const h = parseInt(newStart.split(':')[0]);
            const m = parseInt(newStart.split(':')[1]);
            const endM = (h * 60 + m + 40);
            const endT = `${Math.floor(endM/60).toString().padStart(2,'0')}:${(endM%60).toString().padStart(2,'0')}`;
            const newSlot: LessonSlot = { id: Math.random().toString(36).substr(2, 9), start: newStart, end: endT, studentId, label: oldSlot?.label as any };
            newSlots.push(newSlot);
            newSlots.sort((a, b) => a.start.localeCompare(b.start));
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
      }),
      forceSync: async () => {
          if (user) {
              await DataService.saveUserData(user.id, sanitize(state));
              setIsRecovered(false);
          }
      }
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-bold tracking-widest uppercase text-[10px]">VERİLER KURTARILIYOR...</div>;

  return <CourseContext.Provider value={{ state, isRecovered, actions }}>{children}</CourseContext.Provider>;
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) throw new Error('useCourse must be used within a CourseProvider');
  return context;
};
