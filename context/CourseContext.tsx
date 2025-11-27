
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
  neutral: { 
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 
    500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' 
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
        // Special handling for neutral theme to make primary action buttons dark/black
        if (themeKey === 'neutral' && (key === '500' || key === '600')) {
             root.style.setProperty(`--c-${key}`, theme['900']); // Make primary buttons black
        } else if (themeKey === 'neutral' && key === '50') {
             root.style.setProperty(`--c-${key}`, '#f8fafc'); // Keep bg light
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

    getStudent: (id: string) => stateRef.current.students[id],

    addSlot: (day: any, start: string, end: string) => {
      setAppState(prev => {
        const key = `${prev.currentTeacher}|${day}`;
        const slots = prev.schedule[key] || [];
        if (slots.some(s => s.start === start)) return prev;
        return { ...prev, schedule: { ...prev.schedule, [key]: [...slots, { id: generateId(), start, end, studentId: null }].sort((a,b) => a.start.localeCompare(b.start)) } };
      });
    },

    deleteSlot: (day: any, slotId: string) => {
      setAppState(prev => {
        const key = `${prev.currentTeacher}|${day}`;
        return { ...prev, schedule: { ...prev.schedule, [key]: (prev.schedule[key] || []).filter(s => s.id !== slotId) } };
      });
    },

    bookSlot: (day: any, slotId: string, studentId: string, label: 'REGULAR' | 'MAKEUP' | 'TRIAL' = 'REGULAR') => {
      setAppState(prev => {
        const key = `${prev.currentTeacher}|${day}`;
        const student = prev.students[studentId];
        
        let newStudents = { ...prev.students };
        
        if (student && label === 'MAKEUP') {
            const currentCredit = student.makeupCredit || 0;
            const newCredit = Math.max(0, currentCredit - 1);
            newStudents[studentId] = { ...student, makeupCredit: newCredit };
        }

        return { 
            ...prev, 
            students: newStudents,
            schedule: { ...prev.schedule, [key]: (prev.schedule[key] || []).map(s => s.id === slotId ? { ...s, studentId, label } : s) } 
        };
      });
    },

    cancelSlot: (day: any, slotId: string) => {
      setAppState(prev => {
        const key = `${prev.currentTeacher}|${day}`;
        const slots = prev.schedule[key] || [];
        const slot = slots.find(s => s.id === slotId);
        
        let newStudents = { ...prev.students };

        if (slot && slot.studentId && slot.label === 'MAKEUP') {
            const student = newStudents[slot.studentId];
            if (student) {
                newStudents[slot.studentId] = { ...student, makeupCredit: (student.makeupCredit || 0) + 1 };
            }
        }

        return { 
            ...prev, 
            students: newStudents,
            schedule: { ...prev.schedule, [key]: slots.map(s => s.id === slotId ? { ...s, studentId: null, label: undefined } : s) } 
        };
      });
    },

    addTransaction: (studentId: string, type: 'LESSON' | 'PAYMENT', customDate?: string, amount?: number) => {
      setAppState(prev => {
        const s = prev.students[studentId];
        if (!s) return prev;
        let count = s.debtLessonCount;
        let amt = amount || 0;
        let note = "";
        
        let txDate = new Date().toISOString();
        if (customDate) {
            const d = new Date(customDate);
            d.setHours(12, 0, 0, 0);
            txDate = d.toISOString();
        }

        if (type === 'LESSON') {
          count++;
          note = customDate ? "Ders İşlendi (Geçmiş)" : "Ders İşlendi";
          
          const newTx = { id: generateId(), note, date: txDate, isDebt: true, amount: 0 };
          const newHistory = [...s.history, newTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          return { ...prev, students: { ...prev.students, [studentId]: { ...s, debtLessonCount: count, history: newHistory } } };

        } else {
          if (!amt && count > 0) amt = s.fee;
          if (amt === 0 && count === 0) return prev; 

          if (customDate) {
              note = "Ödeme (Geçmiş)";
          } else {
              note = `Dönem Kapatıldı (${count} Ders)`;
              count = 0; 
          }
            
          const newTx = { id: generateId(), note, date: txDate, isDebt: false, amount: amt };
          const newHistory = [...s.history, newTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
          return { ...prev, students: { ...prev.students, [studentId]: { ...s, debtLessonCount: count, history: newHistory } } };
        }
      });
    },

    updateTransaction: (studentId: string, transactionId: string, note: string) => {
        setAppState(prev => {
            const s = prev.students[studentId];
            if (!s) return prev;
            
            const oldTx = s.history.find(t => t.id === transactionId);
            if (!oldTx) return prev;

            let makeupChange = 0;
            let debtCountChange = 0;

            const wasPending = oldTx.note === "Telafi Bekliyor";
            const isNowPending = note === "Telafi Bekliyor";
            const isResolved = note.includes("Telafi Edildi");

            if (!wasPending && isNowPending) {
                makeupChange = 1;
                debtCountChange = -1; 
            }
            else if (wasPending && !isNowPending) {
                makeupChange = -1;
                if (isResolved) {
                    debtCountChange = 0;
                } else {
                    debtCountChange = 1;
                }
            }

            const newHistory = s.history.map(tx => {
                if (tx.id === transactionId) {
                    return { ...tx, note };
                }
                return tx;
            });

            return { 
                ...prev, 
                students: { 
                    ...prev.students, 
                    [studentId]: { 
                        ...s, 
                        history: newHistory,
                        makeupCredit: Math.max(0, (s.makeupCredit || 0) + makeupChange),
                        debtLessonCount: Math.max(0, s.debtLessonCount + debtCountChange)
                    } 
                } 
            };
        });
    },

    deleteTransaction: (studentId: string, txId: string) => {
        setAppState(prev => {
            const s = prev.students[studentId]; if(!s) return prev;
            const tx = s.history.find(t => t.id === txId); if(!tx) return prev;
            const nh = s.history.filter(t => t.id !== txId);
            let nc = s.debtLessonCount;
            let mc = s.makeupCredit || 0;

            if(tx.isDebt && tx.note !== "Telafi Bekliyor" && !tx.note.includes("Telafi Edildi")) {
                 nc = Math.max(0, nc - 1);
            }
            
            if (tx.note === "Telafi Bekliyor") {
                mc = Math.max(0, mc - 1);
            }

            if (tx.note.includes("Telafi Edildi")) {
                mc = mc + 1;
            }

            return { ...prev, students: { ...prev.students, [studentId]: { ...s, debtLessonCount: nc, history: nh, makeupCredit: mc } } }
        });
    },

    toggleAutoProcessing: () => {
        setAppState(prev => ({ ...prev, autoLessonProcessing: !prev.autoLessonProcessing }));
    }
  }), [setAppState]);

  const providerValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <CourseContext.Provider value={providerValue}>
      {children}
      {syncStatus !== 'IDLE' && (
         <div className="fixed top-2 right-2 z-[100] pointer-events-none flex flex-col items-end gap-1">
            {syncStatus === 'SAVING' && <div className="bg-indigo-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">Buluta Kaydediliyor...</div>}
            {syncStatus === 'SYNCED' && <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">Veriler Güvende</div>}
            {syncStatus === 'ERROR' && <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">Bağlantı Hatası</div>}
            {syncStatus === 'OFFLINE' && <div className="bg-slate-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg opacity-50">Çevrimdışı Mod</div>}
            {syncStatus === 'PERMISSION_ERROR' && (
                <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-lg flex flex-col items-end gap-1 animate-bounce pointer-events-auto">
                    <div className="flex flex-col items-end">
                        <span>⚠️ Veritabanı İzni Yok!</span>
                        <span className="opacity-80 text-[9px]">Firebase Kurallarını Ayarlayın</span>
                    </div>
                    <button 
                        onClick={() => setSyncStatus('IDLE')} 
                        className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-[9px] transition-colors mt-1"
                    >
                        Ayarı Yaptım, Tekrar Dene
                    </button>
                </div>
            )}
         </div>
      )}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) throw new Error("useCourse must be used within a CourseProvider");
  return context;
};
