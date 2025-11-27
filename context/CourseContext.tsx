import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AppState, CourseContextType, LessonSlot, Student, DAYS, WeekDay } from '../types';
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
  indigo: { 
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 
    500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' 
  },
  blue: { 
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 
    500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' 
  },
  emerald: { 
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' 
  },
  rose: { 
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' 
  },
  violet: { 
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' 
  },
  amber: { 
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' 
  },
  slate: { 
    // Mavi/Gri Antrasit
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 
    500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' 
  },
  zinc: { 
    // Nötr Gri
    50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 
    500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' 
  },
  neutral: { 
    // Tam Siyah/Monochrome
    50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 
    500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' 
  }
};

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // 1. State'i Yükle (LocalStorage Öncelikli)
  const [state, setState] = useState<AppState>(() => {
    try {
      const local = localStorage.getItem('course_app_backup');
      return local ? { ...INITIAL_STATE, ...JSON.parse(local) } : INITIAL_STATE;
    } catch {
      return INITIAL_STATE;
    }
  });

  // REFS: Döngüleri kırmak için state'in en güncel halini ref içinde tutuyoruz
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
    
    // Apply Theme Color
    const themeKey = state.themeColor || 'indigo';
    const theme = THEMES[themeKey] || THEMES.indigo;
    
    const root = document.documentElement;
    Object.keys(theme).forEach(key => {
        // Special handling for dark themes to make primary action buttons dark/black
        if ((themeKey === 'neutral' || themeKey === 'zinc' || themeKey === 'slate') && (key === '500' || key === '600')) {
             root.style.setProperty(`--c-${key}`, theme['900']); // Make primary buttons black
        } else if ((themeKey === 'neutral' || themeKey === 'zinc' || themeKey === 'slate') && key === '50') {
             root.style.setProperty(`--c-${key}`, '#f8fafc'); // Keep bg light for readability
        } else {
             root.style.setProperty(`--c-${key}`, theme[key]);
        }
    });
    
  }, [state]);

  const isRemoteUpdate = useRef(false);
  const lastSyncedJson = useRef(""); 
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'ERROR' | 'SYNCED' | 'OFFLINE' | 'PERMISSION_ERROR'>('IDLE');

  // --- CRITICAL FIX: useCallback ---
  // setAppState fonksiyonunu hafızaya sabitliyoruz.
  const setAppState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const newState = updater(prev);
      const withTimestamp = { ...newState, updatedAt: new Date().toISOString() };
      
      try {
        localStorage.setItem('course_app_backup', JSON.stringify(withTimestamp));
      } catch (e) {
        console.error("Yerel kayıt hatası:", e);
      }

      return withTimestamp;
    });
  }, []);

  // --- 2. LISTENER: Sunucudan Gelen Veri ---
  useEffect(() => {
    if (!user) return;
    if (syncStatus === 'PERMISSION_ERROR') return; // İzin hatası varsa dinlemeyi durdur (Retry ile açılır)

    const unsubscribe = DataService.subscribeToUserData(
      user.id,
      (cloudData) => {
        if (!cloudData) return;
        
        // Eğer hata durumundaysak ve veri geldiyse düzelt
        setSyncStatus(prev => prev === 'PERMISSION_ERROR' ? 'IDLE' : prev);

        setState(currentState => {
           const cloudTime = new Date(cloudData.updatedAt || 0).getTime();
           const localTime = new Date(currentState.updatedAt || 0).getTime();

           // Sadece sunucu verisi KESİN OLARAK daha yeniyse kabul et.
           if (cloudTime > localTime) {
              const incomingJson = JSON.stringify(cloudData);
              if (incomingJson !== JSON.stringify(currentState)) {
                  console.log("☁️ Bulut verisi indirildi.");
                  isRemoteUpdate.current = true;
                  lastSyncedJson.current = incomingJson;
                  setSyncStatus('SYNCED');
                  
                  // Gelen veriyi de hemen locale yazalım
                  localStorage.setItem('course_app_backup', incomingJson);
                  
                  setTimeout(() => setSyncStatus('IDLE'), 2000);
                  return { ...INITIAL_STATE, ...cloudData }; 
              }
           } else if (localTime > cloudTime) {
              // lastSyncedJson'u sıfırla ki sync effect tetiklensin
              lastSyncedJson.current = ""; 
           }
           return currentState;
        });
      },
      (err) => {
          console.warn("Sync hatası:", err);
          // Firebase hatası "permission-denied" ise özel durum ayarla
          if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
             setSyncStatus('PERMISSION_ERROR');
          } else {
             setSyncStatus('ERROR');
          }
      }
    );

    return () => unsubscribe();
  }, [user, syncStatus]); // syncStatus dependency eklendi ki Retry basınca yeniden abone olsun

  // --- 3. WRITER: Yerel Değişiklikleri Sunucuya Yaz ---
  useEffect(() => {
    if (!user) return;
    if (syncStatus === 'PERMISSION_ERROR') return; // İzin yoksa deneme

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const currentJson = JSON.stringify(state);
    
    if (currentJson === lastSyncedJson.current) return;

    const saveToCloud = async () => {
      setSyncStatus('SAVING');
      try {
        await DataService.saveUserData(user.id, state);
        lastSyncedJson.current = currentJson;
        setSyncStatus('IDLE');
      } catch (error: any) {
        console.error("Save error:", error);
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
             setSyncStatus('PERMISSION_ERROR');
        } else {
             setSyncStatus('ERROR');
        }
      }
    };

    const timeoutId = setTimeout(saveToCloud, 2000); 
    return () => clearTimeout(timeoutId);

  }, [state, user, syncStatus]);

  // --- 4. OTOMATİK DERS İŞLEME SİSTEMİ ---
  useEffect(() => {
    const processDailyLessons = () => {
        const currentState = stateRef.current;
        
        if (!currentState.autoLessonProcessing || !currentState.currentTeacher) return;

        const today = new Date();
        const dayIndex = (today.getDay() + 6) % 7; // 0=Pazartesi
        const todayName = DAYS[dayIndex]; 
        const dateStr = today.toLocaleDateString('tr-TR'); 

        const scheduleKey = `${currentState.currentTeacher}|${todayName}`;
        const todaysSlots = currentState.schedule[scheduleKey] || [];

        const studentsToCharge: { id: string, label?: string }[] = [];
        
        todaysSlots.forEach(slot => {
            if (slot.studentId) {
                const student = currentState.students[slot.studentId];
                if (student) {
                    // Bu öğrenciye bugün için herhangi bir işlem (ders/telafi/deneme) yapılmış mı?
                    const hasLessonToday = student.history.some(tx => 
                        // isDebt kontrolünü kaldırdım çünkü deneme dersi isDebt=false olabilir ama yine de bugün işlenmiş sayılmalı
                        new Date(tx.date).toLocaleDateString('tr-TR') === dateStr
                    );

                    if (!hasLessonToday) {
                        studentsToCharge.push({ id: student.id, label: slot.label });
                    }
                }
            }
        });

        if (studentsToCharge.length > 0) {
            setAppState(prev => {
                const newStudents = { ...prev.students };
                
                studentsToCharge.forEach(({ id: studId, label }) => {
                    const student = newStudents[studId];
                    if (student) {
                         const newHistory = [...student.history];
                         const transactionId = Math.random().toString(36).substr(2, 9);
                         
                         let note = "Ders İşlendi (Otomatik)";
                         let isDebt = true;
                         let incrementCount = 1;
                         let newMakeupCredit = student.makeupCredit || 0;

                         if (label === 'TRIAL') {
                             note = "Deneme Dersi (Ücretsiz)";
                             isDebt = false;
                             incrementCount = 0; // Deneme dersi sayacı artırmaz
                         } else if (label === 'MAKEUP') {
                             note = "Telafi Dersi (Otomatik)";
                             isDebt = false; // Telafi dersi borç yazmaz (önceden yazılmıştır)
                             incrementCount = 0; // Telafi dersi sayacı artırmaz
                             // Otomatik işlenen telafi dersi krediden düşülmeli mi? 
                             // Genelde planlarken düşeriz ama otomatikte de garantiye alalım:
                             if (newMakeupCredit > 0) newMakeupCredit -= 1;
                         }
                         
                         newHistory.unshift({
                             id: transactionId,
                             note: note,
                             date: new Date().toISOString(),
                             isDebt: isDebt,
                             amount: 0
                         });
                         newHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                         newStudents[studId] = {
                             ...student,
                             debtLessonCount: student.debtLessonCount + incrementCount,
                             makeupCredit: newMakeupCredit,
                             history: newHistory
                         };
                    }
                });

                return { ...prev, students: newStudents };
            });
        }
    };

    processDailyLessons();
    const interval = setInterval(processDailyLessons, 60000);
    
    return () => clearInterval(interval);

  }, [setAppState]);

  // --- DATA SANITIZATION ON LOAD ---
  useEffect(() => {
    const sanitizeAppState = (s: AppState): AppState => {
        const newStudents = { ...s.students };
        let hasChanges = false;

        Object.keys(newStudents).forEach(studId => {
            const student = newStudents[studId];
            let calculatedDebt = 0;
            
            const sortedHistory = [...student.history].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            sortedHistory.forEach(tx => {
                if (!tx.isDebt) {
                    if (tx.note.includes("Dönem Kapatıldı") || tx.note.includes("Ödeme")) {
                         if (!tx.note.includes("(Geçmiş)")) {
                             calculatedDebt = 0;
                         }
                    }
                } else {
                    if (tx.note === "Telafi Bekliyor" || tx.note.includes("Telafi Edildi") || tx.note.includes("Deneme") || tx.note.includes("Habersiz")) {
                        // Do not increment
                    } else {
                        calculatedDebt++;
                    }
                }
            });

            if (student.debtLessonCount !== calculatedDebt) {
                newStudents[studId] = { ...student, debtLessonCount: calculatedDebt };
                hasChanges = true;
            }
        });

        return hasChanges ? { ...s, students: newStudents } : s;
    };

    if (state.updatedAt !== INITIAL_STATE.updatedAt) {
         setAppState(prev => sanitizeAppState(prev));
    }
  }, [setAppState, state.updatedAt]);


  // --- ACTIONS ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const actions = useMemo(() => ({
    updateSchoolName: (name: string) => setAppState(p => ({ ...p, schoolName: name })),
    updateSchoolIcon: (icon: string) => setAppState(p => ({ ...p, schoolIcon: icon })),
    updateThemeColor: (color: string) => setAppState(p => ({ ...p, themeColor: color })),
    
    addTeacher: (name: string) => {
      setAppState(prev => {
        if (prev.teachers.includes(name)) return prev;
        const isFirst = prev.teachers.length === 0;
        return { ...prev, teachers: [...prev.teachers, name], currentTeacher: isFirst ? name : prev.currentTeacher };
      });
    },

    switchTeacher: (name: string) => setAppState(p => ({ ...p, currentTeacher: name })),

    addStudent: (name: string, phone: string, fee: number) => {
      const id = generateId();
      setAppState(prev => ({
        ...prev,
        students: { ...prev.students, [id]: { id, name, phone, fee, registrationDate: new Date().toISOString(), debtLessonCount: 0, makeupCredit: 0, history: [] } }
      }));
      return id;
    },

    updateStudent: (id: string, name: string, phone: string, fee: number) => {
      setAppState(prev => {
        const student = prev.students[id];
        if (!student) return prev;
        return {
          ...prev,
          students: {
            ...prev.students,
            [id]: { ...student, name, phone, fee }
          }
        };
      });
    },

    deleteStudent: (id: string) => {
      setAppState(prev => {
        const ns = { ...prev.students }; delete ns[id];
        const nsch = { ...prev.schedule };
        Object.keys(nsch).forEach(k => nsch[k] = nsch[k].map(s => s.studentId === id ? { ...s, studentId: null, label: undefined } : s));
        return { ...prev, students: ns, schedule: nsch };
      });
    },

    getStudent: (id: string) => state.students[id],

    addSlot: (day: WeekDay, start: string, end: string) => {
        setAppState(prev => {
            const key = `${prev.currentTeacher}|${day}`;
            const currentSlots = prev.schedule[key] || [];
            const newSlot: LessonSlot = { id: generateId(), start, end, studentId: null };
            return {
                ...prev,
                schedule: { ...prev.schedule, [key]: [...currentSlots, newSlot] }
            };
        });
    },

    deleteSlot: (day: WeekDay, slotId: string) => {
        setAppState(prev => {
            const key = `${prev.currentTeacher}|${day}`;
            const currentSlots = prev.schedule[key] || [];
            return {
                ...prev,
                schedule: { ...prev.schedule, [key]: currentSlots.filter(s => s.id !== slotId) }
            };
        });
    },

    bookSlot: (day: WeekDay, slotId: string, studentId: string, label?: 'REGULAR' | 'MAKEUP' | 'TRIAL') => {
        setAppState(prev => {
            const key = `${prev.currentTeacher}|${day}`;
            const currentSlots = prev.schedule[key] || [];
            let newStudents = prev.students;
            
            if (label === 'MAKEUP') {
                 const st = newStudents[studentId];
                 if (st && st.makeupCredit > 0) {
                     newStudents = { ...newStudents, [studentId]: { ...st, makeupCredit: st.makeupCredit - 1 } };
                 }
            }
            
            return {
                ...prev,
                students: newStudents,
                schedule: { 
                    ...prev.schedule, 
                    [key]: currentSlots.map(s => s.id === slotId ? { ...s, studentId, label } : s) 
                }
            };
        });
    },

    cancelSlot: (day: WeekDay, slotId: string) => {
        setAppState(prev => {
            const key = `${prev.currentTeacher}|${day}`;
            const currentSlots = prev.schedule[key] || [];
            return {
                ...prev,
                schedule: { 
                    ...prev.schedule, 
                    [key]: currentSlots.map(s => s.id === slotId ? { ...s, studentId: null, label: undefined } : s) 
                }
            };
        });
    },

    addTransaction: (studentId: string, type: 'LESSON' | 'PAYMENT', customDate?: string, amount?: number) => {
        setAppState(prev => {
            const student = prev.students[studentId];
            if (!student) return prev;
            
            const newHistory = [...student.history];
            const date = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
            
            let note = "";
            let isDebt = false;
            let finalAmount = amount || 0;
            let newDebtCount = student.debtLessonCount;

            if (type === 'LESSON') {
                note = "Geçmiş Ders İşlendi";
                isDebt = true;
                newDebtCount += 1;
            } else {
                if (!amount && !customDate) {
                     note = `Dönem Kapatıldı (${student.debtLessonCount} Ders)`;
                     finalAmount = student.fee;
                     newDebtCount = 0;
                } else {
                     note = "Ödeme (Geçmiş)";
                }
                isDebt = false;
            }

            newHistory.unshift({
                id: generateId(),
                note,
                date,
                isDebt,
                amount: finalAmount
            });
            
            return {
                ...prev,
                students: {
                    ...prev.students,
                    [studentId]: {
                        ...student,
                        debtLessonCount: newDebtCount,
                        history: newHistory
                    }
                }
            };
        });
    },

    updateTransaction: (studentId: string, transactionId: string, note: string) => {
        setAppState(prev => {
            const student = prev.students[studentId];
            if(!student) return prev;
            
            const txIndex = student.history.findIndex(t => t.id === transactionId);
            if(txIndex === -1) return prev;

            const oldNote = student.history[txIndex].note;
            const newHistory = [...student.history];
            newHistory[txIndex] = { ...newHistory[txIndex], note };

            let makeupCreditChange = 0;
            
            if (note === "Telafi Bekliyor" && oldNote !== "Telafi Bekliyor") {
                 makeupCreditChange = 1;
            } else if (note.includes("Telafi Edildi") && oldNote === "Telafi Bekliyor") {
                 makeupCreditChange = -1;
            }

            return {
                ...prev,
                students: {
                    ...prev.students,
                    [studentId]: {
                        ...student,
                        makeupCredit: (student.makeupCredit || 0) + makeupCreditChange,
                        history: newHistory
                    }
                }
            };
        });
    },

    deleteTransaction: (studentId: string, transactionId: string) => {
        setAppState(prev => {
            const student = prev.students[studentId];
            if(!student) return prev;
            
            const tx = student.history.find(t => t.id === transactionId);
            if(!tx) return prev;

            let debtChange = 0;
            if (tx.isDebt && !tx.note.includes("Telafi") && !tx.note.includes("Habersiz") && !tx.note.includes("Deneme")) {
                 debtChange = -1;
            }

            return {
                ...prev,
                students: {
                    ...prev.students,
                    [studentId]: {
                        ...student,
                        debtLessonCount: Math.max(0, student.debtLessonCount + debtChange),
                        history: student.history.filter(t => t.id !== transactionId)
                    }
                }
            };
        });
    },

    toggleAutoProcessing: () => setAppState(p => ({ ...p, autoLessonProcessing: !p.autoLessonProcessing })),

    moveSlot: (fromDay: WeekDay, fromSlotId: string, toDay: WeekDay, toSlotId: string) => {
       // Placeholder
    },
    
    swapSlots: (dayA: WeekDay, slotIdA: string, dayB: WeekDay, slotIdB: string) => {
       // Placeholder
    }

  }), [setAppState, state]);

  return (
    <CourseContext.Provider value={{ state, actions }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};