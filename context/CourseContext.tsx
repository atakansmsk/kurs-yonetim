
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AppState, CourseContextType, LessonSlot, Student, DAYS, WeekDay } from '../types';
import { useAuth } from './AuthContext';
import { DataService } from '../services/api';

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const INITIAL_STATE: AppState = {
  schoolName: "Sanat Okulu",
  schoolIcon: "sparkles",
  themeColor: "red",
  currentTeacher: "",
  teachers: [],
  students: {},
  schedule: {},
  updatedAt: new Date(0).toISOString(),
  autoLessonProcessing: true
};

// RGB Values for Tailwind Colors (50-950)
const THEME_COLORS: Record<string, Record<string, string>> = {
  red: { // Default
    50: '254 242 242', 100: '254 226 226', 200: '254 202 202', 300: '252 165 165',
    400: '248 113 113', 500: '239 68 68', 600: '220 38 38', 700: '185 28 28',
    800: '153 27 27', 900: '127 29 29', 950: '69 10 10'
  },
  blue: {
    50: '239 246 255', 100: '219 234 254', 200: '191 219 254', 300: '147 197 253',
    400: '96 165 250', 500: '59 130 246', 600: '37 99 235', 700: '29 78 216',
    800: '30 64 175', 900: '30 58 138', 950: '23 37 84'
  },
  indigo: {
    50: '238 242 255', 100: '224 231 255', 200: '199 210 254', 300: '165 180 252',
    400: '129 140 248', 500: '99 102 241', 600: '79 70 229', 700: '67 56 202',
    800: '55 48 163', 900: '49 46 129', 950: '30 27 75'
  },
  violet: {
    50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253',
    400: '167 139 250', 500: '139 92 246', 600: '124 58 237', 700: '109 40 217',
    800: '91 33 182', 900: '76 29 149', 950: '46 16 101'
  },
  emerald: {
    50: '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183',
    400: '52 211 153', 500: '16 185 129', 600: '5 150 105', 700: '4 120 87',
    800: '6 95 70', 900: '6 78 59', 950: '2 44 34'
  },
  orange: {
    50: '255 247 237', 100: '255 237 213', 200: '254 215 170', 300: '253 186 116',
    400: '251 146 60', 500: '249 115 22', 600: '234 88 12', 700: '194 65 12',
    800: '154 52 18', 900: '124 45 18', 950: '67 20 7'
  },
  rose: {
    50: '255 241 242', 100: '255 228 229', 200: '254 205 211', 300: '253 164 175',
    400: '251 113 133', 500: '244 63 94', 600: '225 29 72', 700: '190 18 60',
    800: '159 18 57', 900: '136 19 55', 950: '76 5 25'
  },
  gray: { // Gri
    50: '249 250 251', 100: '243 244 246', 200: '229 231 235', 300: '209 213 219',
    400: '156 163 175', 500: '107 114 128', 600: '75 85 99', 700: '55 65 81',
    800: '31 41 55', 900: '17 24 39', 950: '3 7 18'
  },
  zinc: { // Antrasit
    50: '250 250 250', 100: '244 244 245', 200: '228 228 231', 300: '212 212 216',
    400: '161 161 170', 500: '113 113 122', 600: '82 82 91', 700: '63 63 70',
    800: '39 39 42', 900: '24 24 27', 950: '9 9 11'
  },
  neutral: { // Siyah
    50: '250 250 250', 100: '245 245 245', 200: '229 229 229', 300: '212 212 212',
    400: '163 163 163', 500: '115 115 115', 600: '82 82 82', 700: '64 64 64',
    800: '38 38 38', 900: '23 23 23', 950: '10 10 10'
  }
};

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // 1. State'i Yükle (LocalStorage Öncelikli)
  const [state, setState] = useState<AppState>(() => {
    try {
      const local = localStorage.getItem('course_app_backup');
      if (local) {
          const parsed = JSON.parse(local);
          // Ensure new fields exist
          return { ...INITIAL_STATE, ...parsed, themeColor: parsed.themeColor || 'red' };
      }
      return INITIAL_STATE;
    } catch {
      return INITIAL_STATE;
    }
  });

  // REFS: Döngüleri kırmak için state'in en güncel halini ref içinde tutuyoruz
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
    
    // APPLY THEME
    const theme = THEME_COLORS[state.themeColor] || THEME_COLORS['red'];
    const root = document.documentElement;
    Object.keys(theme).forEach(shade => {
        root.style.setProperty(`--theme-${shade}`, theme[shade]);
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
                  
                  // Merge with initial to ensure structure
                  const mergedState = { ...INITIAL_STATE, ...cloudData };
                  
                  // Apply theme immediately on sync
                  const theme = THEME_COLORS[mergedState.themeColor || 'red'] || THEME_COLORS['red'];
                  const root = document.documentElement;
                  Object.keys(theme).forEach(shade => {
                      root.style.setProperty(`--theme-${shade}`, theme[shade]);
                  });

                  return mergedState; 
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
                    const hasLessonToday = student.history.some(tx => 
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
                             incrementCount = 0; 
                         } else if (label === 'MAKEUP') {
                             note = "Telafi Dersi (Otomatik)";
                             isDebt = false; 
                             incrementCount = 0; 
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

  // --- ACTIONS ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const actions = useMemo(() => ({
    updateSchoolName: (name: string) => setAppState(p => ({ ...p, schoolName: name })),
    updateSchoolIcon: (icon: string) => setAppState(p => ({ ...p, schoolIcon: icon })),
    updateTheme: (color: string) => setAppState(p => ({ ...p, themeColor: color })),
    
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
    
    // --- SANITIZE / RECALCULATE STATE ---
    // Bu fonksiyon her açılışta veya senkronizasyonda çağrılabilir.
    // Öğrencinin geçmişine (history) bakarak debtLessonCount ve makeupCredit'i sıfırdan hesaplar.
    // Böylece eski hatalı veriler düzelir.
    sanitizeAppState: () => {
        setAppState(prev => {
            const newStudents = { ...prev.students };
            let hasChanges = false;
            
            Object.keys(newStudents).forEach(studId => {
                const s = newStudents[studId];
                let calcDebt = 0;
                let calcMakeup = 0;
                
                // History'yi eskiden yeniye sırala ki işlemi doğru yapalım
                const sortedHistory = [...s.history].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                sortedHistory.forEach(tx => {
                    if (tx.isDebt) {
                        if (tx.note === "Telafi Bekliyor") {
                            calcMakeup++;
                            // Debt artmaz
                        } else if (tx.note.includes("Telafi Edildi")) {
                            calcMakeup = Math.max(0, calcMakeup - 1);
                            // Debt artmaz
                        } else if (tx.note.includes("Deneme")) {
                            // Debt artmaz
                        } else {
                            // Normal Ders
                            calcDebt++;
                        }
                    } else {
                        // Payment
                        if (tx.note.includes("Dönem Kapatıldı")) {
                            calcDebt = 0;
                        }
                    }
                });
                
                if (s.debtLessonCount !== calcDebt || s.makeupCredit !== calcMakeup) {
                    newStudents[studId] = { ...s, debtLessonCount: calcDebt, makeupCredit: calcMakeup };
                    hasChanges = true;
                }
            });
            
            return hasChanges ? { ...prev, students: newStudents } : prev;
        });
    },

    toggleAutoProcessing: () => {
        setAppState(prev => ({ ...prev, autoLessonProcessing: !prev.autoLessonProcessing }));
    }
  }), [setAppState]);
  
  // Her açılışta verileri temizle/doğrula
  useEffect(() => {
     // Kısa bir gecikme ile çalıştır ki initial load bitsin
     const t = setTimeout(() => {
         actions.sanitizeAppState();
     }, 1000);
     return () => clearTimeout(t);
  }, []); // Sadece mount anında

  const providerValue = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <CourseContext.Provider value={providerValue}>
      {children}
      {syncStatus !== 'IDLE' && (
         <div className="fixed top-2 right-2 z-[100] pointer-events-none flex flex-col items-end gap-1">
            {syncStatus === 'SAVING' && <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">Buluta Kaydediliyor...</div>}
            {syncStatus === 'SYNCED' && <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">Veriler Güvende</div>}
            {syncStatus === 'ERROR' && <div className="bg-orange-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">Bağlantı Hatası</div>}
            {syncStatus === 'OFFLINE' && <div className="bg-slate-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg opacity-50">Çevrimdışı Mod</div>}
            
            {/* ÖZEL HATA MESAJI ve RETRY BUTONU */}
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