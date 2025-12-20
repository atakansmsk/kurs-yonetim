
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
import { CalendarRange, LayoutDashboard, Users2, ChevronDown, Home as HomeIcon, Check, Sparkles, Palette, Music, BookOpen, Trophy, Activity, TrendingUp } from 'lucide-react';

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
        {!selectedStudentId && activeTab !== 'HOME' && (
            <header className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex justify-between items-center animate-slide-up border-b border-slate-100/50">
              <button onClick={() => handleTabChange('HOME')} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors active:scale-95">
                  <HomeIcon size={24} strokeWidth={2} />
              </button>
              <div className="relative group flex-1 flex flex-col items-center z-50">
                  <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-0.5">Eğitmen</div>
                  <button className="flex items-center gap-2 text-lg font-black text-slate-800 tracking-tight hover:opacity-70 transition-opacity">
                      {state.currentTeacher}
                      <div className="bg-indigo-50 text-indigo-600 rounded-full p-0.5">
                         <ChevronDown size={12} strokeWidth={4} />
                      </div>
                  </button>
                  <div className="absolute top-full mt-4 w-64 bg-white/95 backdrop-blur-xl shadow-soft rounded-3xl py-2 hidden group-hover:block border border-white/50 ring-1 ring-black/5 animate-scale-in origin-top">
                      {state.teachers.map(t => (
                          <button key={t} onClick={() => actions.switchTeacher(t)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50/50 transition-colors text-sm text-left">
                              <span className={`font-bold text-base ${t === state.currentTeacher ? 'text-indigo-600' : 'text-slate-600'}`}>{t}</span>
                              {t === state.currentTeacher && <Check size={18} className="text-indigo-600" strokeWidth={3} />}
                          </button>
                      ))}
                  </div>
              </div>
              <div className="w-11"></div>
            </header>
        )}
        <main className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
          {renderContent()}
        </main>
        {!selectedStudentId && activeTab !== 'HOME' && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe pt-2 px-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] animate-slide-up">
              <nav className="flex justify-around items-center h-16">
                <NavButton active={activeTab === 'SCHEDULE'} onClick={() => handleTabChange('SCHEDULE')} icon={CalendarRange} label="Program" />
                <NavButton active={activeTab === 'WEEKLY'} onClick={() => handleTabChange('WEEKLY')} icon={TrendingUp} label="Finans" />
                <NavButton active={activeTab === 'STUDENTS'} onClick={() => handleTabChange('STUDENTS')} icon={Users2} label="Kişiler" />
              </nav>
          </div>
        )}
      </div>
    </>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-300 group active:scale-90`}>
      <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-indigo-50 text-indigo-600 -translate-y-1' : 'text-slate-400 group-hover:text-slate-600'}`}>
          <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      {active && <span className="text-[10px] font-bold text-indigo-600 animate-scale-in leading-none">{label}</span>}
    </button>
);

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const isParentView = params.get('parentView') === 'true';
  const isTeacherView = params.get('teacherView') === 'true';
  const teacherId = params.get('teacherId') || params.get('uid');
  const studentId = params.get('studentId');
  const teacherName = params.get('name');
  if (isParentView && teacherId && studentId) return <ParentView key={Date.now()} teacherId={teacherId} studentId={studentId} />;
  if (isTeacherView && teacherId && teacherName) return <TeacherView key={Date.now()} uid={teacherId} teacherName={teacherName} />;
  return ( <AuthProvider> <CourseProvider> <AppContent /> </CourseProvider> </AuthProvider> );
};

export default App;
