
import React, { useState, useEffect } from 'react';
import { CourseProvider, useCourse } from './context/CourseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Home } from './pages/Home';
import { DailySchedule } from './pages/DailySchedule';
import { WeeklySummary } from './pages/WeeklySummary';
import { StudentList } from './pages/StudentList';
import { StudentProfile } from './pages/StudentProfile';
import { Login } from './pages/Login';
import { ParentView } from './pages/ParentView';
import { TeacherView } from './pages/TeacherView';
import { Dialog } from './components/Dialog';
import { CalendarRange, LayoutDashboard, Users2, ChevronDown, Home as HomeIcon, Check, Sparkles, Palette, Music, BookOpen, Trophy, Activity, TrendingUp, Plus, UserPlus } from 'lucide-react';

type Tab = 'HOME' | 'SCHEDULE' | 'WEEKLY' | 'STUDENTS';

// Logo Mapping
const ICONS: Record<string, React.ElementType> = {
  'sparkles': Sparkles,
  'palette': Palette,
  'music': Music,
  'book': BookOpen,
  'trophy': Trophy,
  'activity': Activity
};

// --- SPLASH SCREEN COMPONENT ---
interface SplashScreenProps {
  onFinish: () => void;
  logoStr: string;
}

const SplashScreen = ({ onFinish, logoStr }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const isCustomLogo = logoStr.startsWith('data:');
  const IconComponent = !isCustomLogo ? (ICONS[logoStr] || Sparkles) : Sparkles;

  useEffect(() => {
    const startExit = () => setIsExiting(true);
    const finish = () => onFinish();
    const t1 = setTimeout(startExit, 500);
    const t2 = setTimeout(finish, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center ${isExiting ? 'animate-slide-out' : ''}`}>
        <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full animate-pulse-slow"></div>
            <div className="relative bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 shadow-2xl animate-pulse-slow flex items-center justify-center overflow-hidden w-64 h-64 p-6">
                {isCustomLogo ? (
                   <img src={logoStr} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                   <IconComponent size={100} className="text-indigo-600" strokeWidth={1.5} />
                )}
            </div>
        </div>
        <div className="mt-8 text-center animate-pulse-slow px-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kurs Pro</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Hazır</p>
        </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { state, actions } = useCourse();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  
  // Teacher Selection States
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (selectedStudentId) {
        setSelectedStudentId(null);
        return;
      }
      if (activeTab !== 'HOME') {
        setActiveTab('HOME');
        return;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedStudentId, activeTab]);

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    if (tab !== 'HOME') {
       window.history.pushState({ view: 'tab', id: tab }, '');
    }
    setActiveTab(tab);
  };

  const handleOpenProfile = (id: string) => {
    window.history.pushState({ view: 'profile', id: id }, '');
    setSelectedStudentId(id);
  };

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      actions.addTeacher(newTeacherName.trim());
      setNewTeacherName("");
      setIsAddTeacherDialogOpen(false);
    }
  };

  if (!user) return <Login />;
  
  const renderContent = () => {
    if (selectedStudentId) {
      return <StudentProfile studentId={selectedStudentId} onBack={() => window.history.back()} />;
    }
    switch (activeTab) {
      case 'HOME': return <Home onNavigate={(t) => handleTabChange(t)} />;
      case 'SCHEDULE': return <DailySchedule onOpenStudentProfile={handleOpenProfile} />;
      case 'WEEKLY': return <WeeklySummary onOpenStudentProfile={handleOpenProfile} />;
      case 'STUDENTS': return <StudentList onSelect={handleOpenProfile} />;
      default: return <Home onNavigate={(t) => handleTabChange(t)} />;
    }
  };

  return (
    <>
      {showSplash && <SplashScreen logoStr={state.schoolIcon} onFinish={() => setShowSplash(false)} />}
      <div className="flex flex-col h-[100dvh] w-full max-w-md bg-[#F8FAFC] shadow-2xl overflow-hidden relative mx-auto sm:rounded-[2.5rem] sm:my-4 sm:h-[calc(100dvh-2rem)] border-0 sm:border-8 border-white ring-1 ring-black/5 animate-in fade-in duration-500">
        
        {/* Header - Fixed & Clickable Teacher Switcher */}
        {!selectedStudentId && (
            <header className="bg-white/90 backdrop-blur-md px-6 py-4 sticky top-0 z-[60] flex justify-between items-center border-b border-slate-100 h-20">
              <button 
                onClick={() => handleTabChange('HOME')} 
                className={`p-2.5 rounded-2xl transition-all active:scale-95 ${activeTab === 'HOME' ? 'text-indigo-600 bg-indigo-50 shadow-inner' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                  <HomeIcon size={24} strokeWidth={2} />
              </button>
              
              <div className="relative flex-1 flex flex-col items-center">
                  <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-0.5">Eğitmen Listesi</div>
                  <button 
                    onClick={() => setIsTeacherMenuOpen(!isTeacherMenuOpen)}
                    className="flex items-center gap-2 text-lg font-black text-slate-800 tracking-tight hover:opacity-70 transition-all active:scale-95"
                  >
                      <span className="truncate max-w-[140px]">{state.currentTeacher || 'Seçiniz'}</span>
                      <ChevronDown size={14} strokeWidth={3} className={`text-indigo-600 transition-transform ${isTeacherMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTeacherMenuOpen && (
                      <div className="absolute top-full mt-2 w-64 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-[2rem] py-3 border border-slate-100 animate-scale-in origin-top overflow-hidden">
                          <div className="max-h-60 overflow-y-auto no-scrollbar">
                              {state.teachers.map(t => (
                                  <button 
                                      key={t} 
                                      onClick={() => { actions.switchTeacher(t); setIsTeacherMenuOpen(false); }} 
                                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                  >
                                      <span className={`font-bold text-sm ${t === state.currentTeacher ? 'text-indigo-600' : 'text-slate-600'}`}>{t}</span>
                                      {t === state.currentTeacher && <Check size={16} className="text-indigo-600" strokeWidth={3} />}
                                  </button>
                              ))}
                          </div>
                          <div className="px-3 pt-2">
                              <button 
                                  onClick={() => { setIsAddTeacherDialogOpen(true); setIsTeacherMenuOpen(false); }}
                                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                              >
                                  <Plus size={14} strokeWidth={3} /> YENİ EKLE
                              </button>
                          </div>
                      </div>
                  )}
              </div>
              <div className="w-11"></div>
            </header>
        )}

        <main className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
          {renderContent()}
        </main>

        {!selectedStudentId && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe pt-2 px-6 shadow-sm animate-slide-up">
              <nav className="flex justify-around items-center h-16">
                <NavButton active={activeTab === 'SCHEDULE'} onClick={() => handleTabChange('SCHEDULE')} icon={CalendarRange} label="Program" />
                <NavButton active={activeTab === 'WEEKLY'} onClick={() => handleTabChange('WEEKLY')} icon={TrendingUp} label="Finans" />
                <NavButton active={activeTab === 'STUDENTS'} onClick={() => handleTabChange('STUDENTS')} icon={Users2} label="Kişiler" />
              </nav>
          </div>
        )}

        <Dialog 
            isOpen={isAddTeacherDialogOpen} 
            onClose={() => setIsAddTeacherDialogOpen(false)} 
            title="Eğitmen Ekle"
            actions={<button onClick={handleAddTeacher} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Ekle</button>}
        >
            <input 
                type="text" 
                value={newTeacherName} 
                onChange={(e) => setNewTeacherName(e.target.value)} 
                placeholder="İsim giriniz..." 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none"
            />
        </Dialog>
      </div>
    </>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all group`}>
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
          <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      {active && <span className="text-[10px] font-bold text-indigo-600 leading-none">{label}</span>}
    </button>
);

const App: React.FC = () => {
  return ( <AuthProvider> <CourseProvider> <AppContent /> </CourseProvider> </AuthProvider> );
};

export default App;
