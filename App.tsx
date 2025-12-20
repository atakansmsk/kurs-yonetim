
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
import { CalendarRange, Users2, Home as HomeIcon, TrendingUp } from 'lucide-react';

type Tab = 'HOME' | 'SCHEDULE' | 'WEEKLY' | 'STUDENTS';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { state } = useCourse();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedStudentId) { setSelectedStudentId(null); return; }
      if (activeTab !== 'HOME') { setActiveTab('HOME'); return; }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedStudentId, activeTab]);

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    if (tab !== 'HOME') window.history.pushState({ view: 'tab', id: tab }, '');
    setActiveTab(tab);
  };

  const handleOpenProfile = (id: string) => {
    window.history.pushState({ view: 'profile', id: id }, '');
    setSelectedStudentId(id);
  };

  if (!user) return <Login />;
  
  const renderContent = () => {
    if (selectedStudentId) return <StudentProfile studentId={selectedStudentId} onBack={() => window.history.back()} />;
    switch (activeTab) {
      case 'HOME': return <Home onNavigate={(t) => handleTabChange(t)} />;
      case 'SCHEDULE': return <DailySchedule onOpenStudentProfile={handleOpenProfile} />;
      case 'WEEKLY': return <WeeklySummary onOpenStudentProfile={handleOpenProfile} />;
      case 'STUDENTS': return <StudentList onSelect={handleOpenProfile} />;
      default: return <Home onNavigate={(t) => handleTabChange(t)} />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md bg-[#F8FAFC] shadow-2xl overflow-hidden relative mx-auto sm:rounded-[2.5rem] sm:my-4 sm:h-[calc(100dvh-2rem)] border-0 sm:border-8 border-white ring-1 ring-black/5 animate-in fade-in duration-500">
      
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>

      {!selectedStudentId && (
        <div className="bg-white border-t border-slate-100 pb-safe pt-2 px-6 shadow-sm">
            <nav className="flex justify-around items-center h-16">
              <NavButton active={activeTab === 'HOME'} onClick={() => handleTabChange('HOME')} icon={HomeIcon} label="Ana Sayfa" />
              <NavButton active={activeTab === 'SCHEDULE'} onClick={() => handleTabChange('SCHEDULE')} icon={CalendarRange} label="Program" />
              <NavButton active={activeTab === 'WEEKLY'} onClick={() => handleTabChange('WEEKLY')} icon={TrendingUp} label="Finans" />
              <NavButton active={activeTab === 'STUDENTS'} onClick={() => handleTabChange('STUDENTS')} icon={Users2} label="Kişiler" />
            </nav>
        </div>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-1 h-full active:scale-90 transition-all">
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
          <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      {active && <span className="text-[10px] font-bold text-indigo-600">{label}</span>}
    </button>
);

const App: React.FC = () => {
  return ( <AuthProvider> <CourseProvider> <AppContent /> </CourseProvider> </AuthProvider> );
};

export default App;
