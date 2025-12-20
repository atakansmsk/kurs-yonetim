
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

  useEffect(() => {
    if (!user) { setState(INITIAL_STATE); setIsLoaded(true); return; }
    
    const unsubscribe = DataService.subscribeToUserData(
        user.id,
        (newData) => {
            // VERİ KURTARMA (RECOVERY):
            // Eğer students objesi boş görünüyorsa ama newData içinde veri varsa zorla al.
            // Eğer currentTeacher boşsa varsayılanı ata.
            const recoveredData = { ...newData };
            
            if (!recoveredData.students) recoveredData.students = {};
            if (!recoveredData.teachers || recoveredData.teachers.length === 0) recoveredData.teachers = ["Eğitmen"];
            if (!recoveredData.currentTeacher) recoveredData.currentTeacher = recoveredData.teachers[0];

            setState(recoveredData);
            setIsLoaded(true);
        },
        (error) => { 
            console.error("Sync Error", error); 
            setIsLoaded(true); 
        }
    );
    return () => unsubscribe();
  }, [user]);

  const updateState = (updater: (prev: AppState) => AppState) => {
      setState(current => {
          const newState = updater(current);
          newState.updatedAt = new Date().toISOString();
          if (user) {
              DataService.saveUserData(user.id, sanitize(newState)).catch(err => console.error("SAVE ERROR:", err));
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
      moveStudent: (studentId, fromDay, fromSlotId, toDay, newStart) => {},
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

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC] text-slate-400 font-bold tracking-widest uppercase text-[10px]">Veriler Yükleniyor...</div>;

  return <CourseContext.Provider value={{ state, actions }}>{children}</CourseContext.Provider>;
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) throw new Error('useCourse must be used within a CourseProvider');
  return context;
};
