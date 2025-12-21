
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student } from '../types';
import { Trash2, Search, UserPlus, AlertCircle, CheckCircle2, Clock, UserCheck, UserMinus, ChevronRight, TrendingUp, CreditCard } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface StudentListProps {
    onSelect: (id: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onSelect }) => {
  const { state, actions } = useCourse();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'DEBTORS' | 'PAID'>('DEBTORS');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleDateString('tr-TR', { month: 'long' });

  // Advanced financial classification logic
  const { debtors, paidStudents, stats } = useMemo(() => {
      const allStudents = Object.values(state.students || {}) as Student[];
      const activeOnes = allStudents.filter(s => s.isActive !== false);

      let debtorsList: Student[] = [];
      let paidList: Student[] = [];
      let totalExpected = 0;
      let totalCollected = 0;

      activeOnes.forEach(student => {
          // A student is considered "Paid" if they have at least one PAYMENT transaction this month
          const hasPaidThisMonth = (student.history || []).some(tx => {
              const d = new Date(tx.date);
              return !tx.isDebt && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });

          if (hasPaidThisMonth) {
              paidList.push(student);
              totalCollected += student.fee || 0;
          } else {
              debtorsList.push(student);
              totalExpected += student.fee || 0;
          }
      });

      // Search filter
      const filterFn = (s: Student) => s.name.toLowerCase().includes(search.toLowerCase());
      
      return {
          debtors: debtorsList.filter(filterFn).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
          paidStudents: paidList.filter(filterFn).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
          stats: { totalExpected, totalCollected, countDebtors: debtorsList.length, countPaid: paidList.length }
      };
  }, [state.students, search, currentMonth, currentYear]);

  const handleAddStudent = () => {
      if(newName.trim()) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F172A]"> {/* Darker background for the page */}
      {/* Header & Stats - Premium Dark Design */}
      <div className="bg-slate-900 px-5 pt-8 pb-6 sticky top-0 z-20 shadow-xl border-b border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Öğrenci Rehberi</h2>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{monthName} Ayı Takibi</p>
                </div>
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/50 active:scale-95 transition-all"
            >
                <UserPlus size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 relative overflow-hidden backdrop-blur-sm">
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-1">BEKLEYEN ÖDEME</span>
                  <span className="text-xl font-black text-white">{stats.totalExpected.toLocaleString()} ₺</span>
                  <UserMinus className="absolute right-[-10px] bottom-[-10px] text-red-500/10" size={56} />
              </div>
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 relative overflow-hidden backdrop-blur-sm">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">TAHSİL EDİLEN</span>
                  <span className="text-xl font-black text-white">{stats.totalCollected.toLocaleString()} ₺</span>
                  <UserCheck className="absolute right-[-10px] bottom-[-10px] text-emerald-500/10" size={56} />
              </div>
          </div>
          
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                placeholder="Öğrenci ismi ile ara..."
                className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tab Switcher - Premium Dark */}
          <div className="flex p-1.5 bg-slate-800 rounded-2xl border border-slate-700/50">
              <button 
                onClick={() => setActiveTab('DEBTORS')}
                className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'DEBTORS' ? 'bg-slate-700 text-red-400 shadow-md ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <Clock size={14} /> BEKLEYENLER ({stats.countDebtors})
              </button>
              <button 
                onClick={() => setActiveTab('PAID')}
                className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'PAID' ? 'bg-slate-700 text-emerald-400 shadow-md ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <CheckCircle2 size={14} /> ÖDEYENLER ({stats.countPaid})
              </button>
          </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-32 custom-scrollbar">
            {(activeTab === 'DEBTORS' ? debtors : paidStudents).length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                     <AlertCircle size={48} className="text-slate-600 mb-3" />
                     <p className="font-bold text-slate-500 text-sm">Bu grupta kayıt bulunamadı.</p>
                 </div>
            ) : (
                (activeTab === 'DEBTORS' ? debtors : paidStudents).map(student => (
                    <div 
                        key={student.id} 
                        className={`group bg-slate-900/50 rounded-2xl p-4 shadow-sm border flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all ${activeTab === 'DEBTORS' ? 'border-slate-800 hover:border-red-500/30' : 'border-slate-800 hover:border-emerald-500/30'}`}
                        onClick={() => onSelect(student.id)}
                    >
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 border shadow-inner ${activeTab === 'DEBTORS' ? 'bg-slate-800 text-red-500 border-red-500/20' : 'bg-slate-800 text-emerald-500 border-emerald-500/20'}`}>
                            {student.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-100 truncate leading-tight group-hover:text-white transition-colors">{student.name}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${activeTab === 'DEBTORS' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                    <CreditCard size={10} /> {student.fee} ₺
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                    {activeTab === 'DEBTORS' ? 'ÖDEME BEKLİYOR' : 'TAHSİLAT TAMAM'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 hover:bg-red-500/10 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                            <ChevronRight size={20} className="text-slate-800 group-hover:text-slate-600 transition-colors" />
                        </div>
                    </div>
                ))
            )}
            
            {/* Archive Notice */}
            {activeTab === 'PAID' && (Object.values(state.students || {}) as Student[]).some(s => s.isActive === false) && (
                <div className="pt-6 pb-2 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                        <UserMinus size={12} className="text-slate-600" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">Pasif kayıtlar arşivde gizlendi</span>
                    </div>
                </div>
            )}
      </div>

      {/* FAB (Add Student) - Overlay for mobile feel */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-900/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30 ring-4 ring-[#0F172A]"
      >
        <UserPlus size={28} />
      </button>

      {/* MODALS */}
      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Kayıt" actions={<button onClick={handleAddStudent} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20">Kaydet</button>}>
        <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Öğrenci Adı</label>
                <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="İsim Soyisim" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">İletişim</label>
                <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="Telefon (Opsiyonel)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Aylık Ücret (₺)</label>
                <input type="number" value={newFee} onChange={e=>setNewFee(e.target.value)} placeholder="Aylık Ücret" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-colors" />
            </div>
        </div>
      </Dialog>

      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Kaydı Sil" actions={<button onClick={() => { if(deleteId) actions.deleteStudent(deleteId); setDeleteId(null); }} className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm">Sil</button>}>
        <div className="p-1">
            <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                Bu öğrenciyi ve <span className="text-red-600 font-black">tüm ödeme/ders geçmişini</span> kalıcı olarak silmek istediğinizden emin misiniz?
            </p>
        </div>
      </Dialog>
    </div>
  );
};
