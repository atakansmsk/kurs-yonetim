
import React, { useState, useRef, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Pencil, ArrowRight, Sparkles, Palette, Music, BookOpen, Trophy, Activity, UserPlus, ImagePlus, Users, LogOut, Settings, RefreshCw, CheckCircle2, Zap, GraduationCap, CalendarRange, ChevronRight } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface HomeProps {
  onNavigate: (tab: 'SCHEDULE' | 'STUDENTS') => void;
}

const ICONS: Record<string, React.ElementType> = {
  'sparkles': Sparkles,
  'palette': Palette,
  'music': Music,
  'book': BookOpen,
  'trophy': Trophy,
  'activity': Activity
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state, actions } = useCourse();
  const { logout, user } = useAuth();
  
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isTeachersListOpen, setIsTeachersListOpen] = useState(false);
  const [isAddTeacherMode, setIsAddTeacherMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomLogo = state.schoolIcon.startsWith('data:');
  const CurrentIcon = !isCustomLogo ? (ICONS[state.schoolIcon] || Sparkles) : Sparkles;
  
  const today = "Pazartesi"; // Gerçek gün entegrasyonu yapılabilir
  const todayKey = `${state.currentTeacher}|${today}`;
  const todayLessons = (state.schedule[todayKey] || []).filter(s => s.studentId).length;
  
  // HELPER: Belirli bir öğretmenin kaç farklı öğrencisi olduğunu hesapla
  const getStudentCountForTeacher = (teacherName: string) => {
    const uniqueStudents = new Set<string>();
    // Schedule anahtarları "TeacherName|Day" formatındadır
    Object.keys(state.schedule).forEach(key => {
        if (key.startsWith(`${teacherName}|`)) {
            state.schedule[key].forEach(slot => {
                if (slot.studentId) {
                    uniqueStudents.add(slot.studentId);
                }
            });
        }
    });
    return uniqueStudents.size;
  };

  const currentTeacherStudentCount = useMemo(() => getStudentCountForTeacher(state.currentTeacher), [state.schedule, state.currentTeacher]);

  const handleSaveTeacher = () => {
    if (newTeacherName.trim()) {
      actions.addTeacher(newTeacherName.trim());
      setNewTeacherName("");
      setIsAddTeacherMode(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        actions.updateSchoolIcon(reader.result as string);
        setIsLogoModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto px-4 pt-6 pb-24">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
             <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-md">
                 {user?.name?.charAt(0).toUpperCase()}
             </div>
             <div>
                 <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide flex items-center gap-1">
                        ONLİNE <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </p>
                 </div>
                 <p className="text-sm font-black text-slate-800 leading-none">{user?.name}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white text-slate-400 rounded-xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors relative">
                <Settings size={18} />
                {state.autoLessonProcessing && <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white"></div>}
            </button>
            <button onClick={logout} className="p-2 bg-white text-red-500 rounded-xl border border-slate-100 shadow-sm hover:bg-red-50 transition-colors">
                <LogOut size={18} />
            </button>
          </div>
      </div>

      {/* Banner */}
      <button 
         onClick={() => setIsLogoModalOpen(true)}
         className="w-full bg-white rounded-[2rem] p-2 shadow-sm border border-slate-100 mb-6 relative group overflow-hidden active:scale-[0.99] transition-all"
      >
         {isCustomLogo ? (
             <div className="w-full h-36 rounded-[1.5rem] overflow-hidden bg-white flex items-center justify-center relative">
                <img src={state.schoolIcon} alt="Logo" className="h-full w-full object-contain" />
             </div>
         ) : (
             <div className="w-full h-36 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex flex-col items-center justify-center text-white shadow-inner gap-3 relative overflow-hidden">
                <CurrentIcon size={48} strokeWidth={1.5} className="relative z-10 drop-shadow-lg" />
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] relative z-10 border border-white/20 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">Logonuzu Yükleyin</span>
             </div>
         )}
         <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white/90 hover:bg-black/40 transition-colors z-20">
             <Pencil size={16} />
         </div>
      </button>

      {/* Otomatik Ders Bilgisi */}
      {state.autoLessonProcessing && (
          <div className="mb-4 bg-gradient-to-r from-indigo-50 to-white p-3 rounded-2xl border border-indigo-100 flex items-center gap-3 shadow-sm animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Zap size={16} fill="currentColor" />
              </div>
              <div>
                  <h4 className="text-xs font-black text-indigo-900">Otomatik Ders Sistemi Aktif</h4>
                  <p className="text-[10px] text-indigo-700/80 font-medium">Bugün programda olan öğrencilerin dersleri otomatik olarak işlenir.</p>
              </div>
          </div>
      )}

      {/* Clean Stats Grid */}
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 ml-1">Eğitmen Özeti ({state.currentTeacher})</h3>
      <div className="grid grid-cols-2 gap-3 mb-4 animate-slide-up">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl mb-1">
                <GraduationCap size={20} />
             </div>
             <span className="text-2xl font-black text-slate-800">{currentTeacherStudentCount}</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase text-center">Aktif Öğrenciniz</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1">
             <div className="p-2 bg-orange-50 text-orange-500 rounded-xl mb-1">
                <CalendarRange size={20} />
             </div>
             <span className="text-2xl font-black text-slate-800">{todayLessons}</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase text-center">Bugünkü Ders</span>
          </div>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up">
        {/* HIZLI PROGRAM KARTI */}
        <button 
           onClick={() => onNavigate('SCHEDULE')}
           className="col-span-2 relative overflow-hidden bg-white p-5 rounded-3xl shadow-sm border border-slate-100 group hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99]"
        >
             {/* Background Icon */}
             <div className="absolute -right-4 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Calendar size={120} className="text-indigo-600" />
             </div>

             <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calendar size={24} />
                    </div>
                    <div className="text-left">
                        <h4 className="font-black text-lg text-slate-800">Ders Programı</h4>
                        <p className="text-xs text-slate-400 font-medium">Haftalık planı görüntüle</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ArrowRight size={16} />
                </div>
             </div>
        </button>

        {/* Eğitmen Listesi */}
        <button 
           onClick={() => setIsTeachersListOpen(true)} 
           className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 group hover:border-slate-300 transition-all active:scale-[0.99]"
        >
             <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Users size={20} />
             </div>
             <div className="text-left">
                 <h4 className="font-bold text-slate-800 text-sm">Eğitmenler</h4>
                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">Yönetim Paneli</p>
             </div>
        </button>

         {/* Diğer Kısayol (Örn: Öğrenci Ekle) */}
         <button 
           onClick={() => onNavigate('STUDENTS')} 
           className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-32 group hover:border-slate-300 transition-all active:scale-[0.99]"
        >
             <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <UserPlus size={20} />
             </div>
             <div className="text-left">
                 <h4 className="font-bold text-slate-800 text-sm">Öğrenci Ekle</h4>
                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">Hızlı Kayıt</p>
             </div>
        </button>
      </div>

      {/* Logo Modal */}
      <Dialog isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} title="Logo Düzenle">
        <div className="grid grid-cols-4 gap-3 p-1">
          <button onClick={() => fileInputRef.current?.click()} className="col-span-4 py-6 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-500 bg-indigo-50/30 hover:bg-indigo-50 transition-all mb-2">
            <ImagePlus size={32} />
            <span className="text-xs font-black uppercase tracking-wide">Galeriden Yükle</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
          {Object.keys(ICONS).map((key) => {
            const Icon = ICONS[key];
            return (
              <button key={key} onClick={() => { actions.updateSchoolIcon(key); setIsLogoModalOpen(false); }} className={`aspect-square flex items-center justify-center rounded-2xl border transition-all ${state.schoolIcon === key ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                <Icon size={24} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </Dialog>

      {/* Teachers Modal */}
      <Dialog isOpen={isTeachersListOpen} onClose={() => { setIsTeachersListOpen(false); setIsAddTeacherMode(false); }} title={isAddTeacherMode ? "Yeni Eğitmen" : "Eğitmenler"}
        actions={
            isAddTeacherMode ? (
                <>
                     <button onClick={() => setIsAddTeacherMode(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">Geri</button>
                     <button onClick={handleSaveTeacher} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md shadow-slate-300 hover:shadow-none transition-all active:scale-95">Kaydet</button>
                </>
            ) : (
                <button onClick={() => setIsAddTeacherMode(true)} className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95">
                    <UserPlus size={16} /> Eğitmen Ekle
                </button>
            )
        }
      >
          {isAddTeacherMode ? (
              <div className="py-1"><input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-slate-900 outline-none" placeholder="Ad Soyad..." autoFocus /></div>
          ) : (
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {state.teachers.length === 0 ? <div className="text-center py-6 opacity-50"><p className="font-bold text-sm text-slate-400">Kayıtlı eğitmen yok.</p></div> : 
                      state.teachers.map(teacher => {
                          const count = getStudentCountForTeacher(teacher);
                          return (
                            <div key={teacher} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${teacher === state.currentTeacher ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{teacher.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{teacher}</div>
                                        <div className="text-[10px] font-bold text-slate-400">{count} Öğrenci</div>
                                    </div>
                                </div>
                                {teacher !== state.currentTeacher && <button onClick={() => { actions.switchTeacher(teacher); setIsTeachersListOpen(false); }} className="px-3 py-1.5 text-[10px] font-bold border border-slate-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Seç</button>}
                            </div>
                          );
                      })
                  }
              </div>
          )}
      </Dialog>

      {/* Settings Modal */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Ayarlar">
        <div className="py-2 flex flex-col gap-4">
            {/* Otomatik Ders Toggle */}
            <button onClick={actions.toggleAutoProcessing} className={`p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-95 ${state.autoLessonProcessing ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${state.autoLessonProcessing ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-bold text-sm ${state.autoLessonProcessing ? 'text-indigo-900' : 'text-slate-700'}`}>Otomatik Ders İşle</h4>
                        <p className="text-[10px] opacity-70 leading-tight mt-0.5">Ders günü gelen öğrencileri<br/>otomatik olarak borçlandır.</p>
                    </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${state.autoLessonProcessing ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${state.autoLessonProcessing ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
            </button>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                    <CheckCircle2 size={20} />
                    <span className="font-bold text-sm">Akıllı Senkronizasyon</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                    Bağlantı kopsa bile verileriniz cihazda saklanır ve internet geldiğinde otomatik gönderilir.
                </p>
                <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold w-full hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                    <RefreshCw size={14} /> Bağlantıyı Yenile
                </button>
            </div>
        </div>
      </Dialog>
    </div>
  );
};
