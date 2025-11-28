
import React, { useEffect, useState } from 'react';
import { DataService } from '../services/api';
import { AppState, Student, DAYS } from '../types';
import { Calendar, CheckCircle2, Clock, Layers, ShieldCheck, Sparkles, User, XCircle } from 'lucide-react';

interface ParentViewProps {
  teacherId: string;
  studentId: string;
}

export const ParentView: React.FC<ParentViewProps> = ({ teacherId, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ student: Student, appState: AppState } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Not: Gerçek senaryoda Firestore kurallarının bu okumaya izin vermesi gerekir.
        // Şimdilik öğretmenin verisini çekip içinden öğrenciyi buluyoruz.
        const schoolData = await DataService.getPublicSchoolData(teacherId);
        
        if (!schoolData) {
          setError("Kurum verisine ulaşılamadı.");
          return;
        }

        const student = schoolData.students[studentId];
        if (!student) {
          setError("Öğrenci kaydı bulunamadı veya silinmiş.");
          return;
        }

        setData({ student, appState: schoolData });
      } catch (err) {
        console.error(err);
        setError("Veri yüklenirken bağlantı hatası oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium text-sm">Veli Portalı Yükleniyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
          <XCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Bağlantı Hatası</h3>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
      </div>
    );
  }

  const { student, appState } = data;

  // --- Gelecek Ders Hesaplama ---
  const getNextLesson = () => {
    const today = new Date();
    const dayIndex = today.getDay(); // 0=Pazar
    const daysMap = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cmt"];
    
    // Basit bir sonraki ders mantığı:
    // Programda bu öğrencinin ID'sinin geçtiği ilk günü bul.
    for (let i = 0; i < 7; i++) {
        const checkDayIndex = (dayIndex + i) % 7;
        const dayName = daysMap[checkDayIndex];
        const key = `${appState.currentTeacher}|${dayName}`;
        const slots = appState.schedule[key] || [];
        
        const foundSlot = slots.find(s => s.studentId === student.id);
        
        if (foundSlot) {
            // Eğer bugünse ve saati geçtiyse bir sonrakine bakmalı (Burayı basit tutuyoruz)
            return { day: dayName, time: `${foundSlot.start} - ${foundSlot.end}` };
        }
    }
    return null;
  };

  const nextLesson = getNextLesson();

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Header */}
      <div className="bg-white p-6 pb-8 rounded-b-[2.5rem] shadow-sm border-b border-slate-100 relative z-10">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
            </div>
            <div>
                <h1 className="font-black text-slate-800 text-lg leading-none">{appState.schoolName}</h1>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Veli Bilgilendirme Sistemi</p>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-slate-200">
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Öğrenci</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-0.5">{student.name}</h2>
                <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-md">
                    <ShieldCheck size={10} />
                    Aktif Kayıt
                </div>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 -mt-4 relative z-0">
        
        {/* Gelecek Ders Kartı */}
        <div className="bg-indigo-600 text-white p-5 rounded-3xl shadow-lg shadow-indigo-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 opacity-80 mb-2">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Planlanan Ders</span>
                </div>
                {nextLesson ? (
                    <div>
                        <div className="text-3xl font-black">{nextLesson.day}</div>
                        <div className="text-lg font-medium opacity-90 mt-1">Saat: {nextLesson.time}</div>
                    </div>
                ) : (
                    <div className="text-lg font-bold opacity-90">Planlanmış ders bulunmuyor.</div>
                )}
            </div>
        </div>

        {/* Durum Özeti */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <CheckCircle2 size={16} />
                </div>
                <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Bu Ay Yapılan</span>
                    <div className="text-2xl font-black text-slate-800">{student.debtLessonCount} Ders</div>
                </div>
            </div>

            <div className={`p-4 rounded-3xl border shadow-sm flex flex-col gap-2 ${student.makeupCredit > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${student.makeupCredit > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Layers size={16} />
                </div>
                <div>
                    <span className={`text-[10px] font-bold uppercase ${student.makeupCredit > 0 ? 'text-orange-400' : 'text-slate-400'}`}>Telafi Hakkı</span>
                    <div className={`text-2xl font-black ${student.makeupCredit > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{student.makeupCredit} Adet</div>
                </div>
            </div>
        </div>

        {/* Son Hareketler */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Son Hareketler</h3>
            <div className="space-y-4">
                {student.history.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-4">Kayıt yok.</p>
                ) : (
                    student.history.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${tx.isDebt ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-700">{tx.note}</div>
                                <div className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString('tr-TR')}</div>
                            </div>
                            {!tx.isDebt && <span className="text-xs font-bold text-emerald-600">+{tx.amount}₺</span>}
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="text-center pt-4 pb-8">
            <p className="text-[10px] text-slate-300 font-bold">Kurs Pro Güvencesiyle</p>
        </div>

      </div>
    </div>
  );
};
