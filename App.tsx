
import React, { useState, useEffect, useMemo } from 'react';
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

const THEME_PALETTES: Record<string, Record<string, string>> = {
  indigo: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b'
  },
  blue: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22'
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065'
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03'
  },
  midnight: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#334155', 600: '#1e293b', 700: '#0f172a', 800: '#020617', 900: '#000000', 950: '#000000'
  },
  carbon: {
    50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#404040', 600: '#262626', 700: '#171717', 800: '#0a0a0a', 900: '#050505', 950: '#000000'
  },
  neutral: {
    50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a'
  }
};

const useThemeManager = (color?: string) => {
  useEffect(() => {
    const theme = color || 'indigo';
    const palette = THEME_PALETTES[theme] || THEME_PALETTES['indigo'];
    const root = document.documentElement;
    Object.entries(palette).forEach(([shade, hex]) => {
      root.style.setProperty(`--c-${shade}`, hex);
    });
  }, [color]);
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { state } = useCourse();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useThemeManager(state.themeColor);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isParentView = urlParams.get('parentView') === 'true';
  const isTeacherView = urlParams.get('teacherView') === 'true';

  useEffect(() => {
    const handlePopState = () => {
      if (selectedStudentId) { setSelectedStudentId(null); return; }
      if (activeTab !== 'HOME') { setActiveTab('HOME'); return; }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedStudentId, activeTab]);

  // Handle External Views First (No Login Required)
  if (isParentView) {
    const tId = urlParams.get('teacherId');
    const sId = urlParams.get('studentId');
    if (tId && sId) return <ParentView teacherId={tId} studentId={sId} />;
  }

  if (isTeacherView) {
    const uid = urlParams.get('uid');
    const name = urlParams.get('name');
    if (uid && name) return <TeacherView uid={uid} teacherName={decodeURIComponent(name)} />;
  }

  // Teacher Auth Flow
  if (!user) return <Login />;
  
  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    if (tab !== 'HOME') window.history.pushState({ view: 'tab', id: tab }, '');
    setActiveTab(tab);
  };

  const handleOpenProfile = (id: string) => {
    window.history.pushState({ view: 'profile', id: id }, '');
    setSelectedStudentId(id);
  };

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
