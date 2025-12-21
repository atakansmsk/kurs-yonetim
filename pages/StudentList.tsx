
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student, Transaction } from '../types';
import { Trash2, Search, UserPlus, AlertCircle, CheckCircle2, Clock, Wallet, Banknote, UserCheck, UserMinus, ChevronRight } from 'lucide-react';
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthName = new Date().toLocaleDateString('tr-TR', { month: 'long' });

  // Student classification logic
  const { debtors, paidStudents, stats } = useMemo(() => {
      const allStudents = Object.values(state.students || {}) as Student[];
      const activeOnes = allStudents.filter(s => s.isActive !== false);

      let debtorsList: Student[] = [];
      let paidList: Student[] = [];
      let totalExpected = 0;
      let totalCollected = 0;

      activeOnes.forEach(student => {
          // Check if paid this month
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
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header & Stats */}
      <div className="bg-white px-5 pt-8 pb-4 sticky top-0 z-20 shadow-sm border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Rehber</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{monthName} Ayı Durumu</p>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <UserPlus size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-red-50 p-3 rounded-2xl border border-red-100 relative overflow-hidden">
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-1">Bekleyen</span>
                  <span className="text-lg font-black text-red-700">{stats.totalExpected.toLocaleString()} ₺</span>
                  <UserMinus className="absolute right-[-8px] bottom-[-8px] text-red-200 opacity-30" size={40} />
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 relative overflow-hidden">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Alınan</span>
                  <span className="text-lg font-black text-emerald-700">{stats.totalCollected.toLocaleString()} ₺</span>
                  <UserCheck className="absolute right-[-8px] bottom-[-8px] text-emerald-200 opacity-30" size={40} />
              </div>
          </div>
          
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                placeholder="İsim ile ara..."
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setActiveTab('DEBTORS')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'DEBTORS' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
              >
                  <Clock size={14} /> Ödeme Bekleyen ({stats.countDebtors})
              </button>
              <button 
                onClick={() => setActiveTab('PAID')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'PAID' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
              >
                  <CheckCircle2 size={14} /> Ödeyenler ({stats.countPaid})
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-32">
            {(activeTab === 'DEBTORS' ? debtors : paidStudents).length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                     <AlertCircle size={48} className="text-slate-300 mb-3" />
                     <p className="font-bold text-slate-400 text-sm">Bu grupta kayıt bulunamadı.</p>
                 </div>
            ) : (
                (activeTab === 'DEBTORS' ? debtors : paidStudents).map(student => (
                    <div 
                        key={student.id} 
                        className={`group bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all ${activeTab === 'DEBTORS' ? 'border-red-50 hover:border-red-200' : 'border-emerald-50 hover:border-emerald-200'}`}
                        onClick={() => onSelect(student.id)}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${activeTab === 'DEBTORS' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {student.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate leading-tight">{student.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${activeTab === 'DEBTORS' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {student.fee} ₺
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {activeTab === 'DEBTORS' ? 'BEKLİYOR' : 'ÖDENDİ'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                            <ChevronRight size={18} className="text-slate-300" />
                        </div>
                    </div>
                ))
            )}
            
            {/* Passive / Archive Students Notice */}
            {/* Fix: Explicitly cast Object.values(state.students) to Student[] to ensure isActive is correctly typed */}
            {activeTab === 'PAID' && (Object.values(state.students || {}) as Student[]).some(s => s.isActive === false) && (
                <div className="pt-4 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Diğer kayıtlar arşivde gizlendi</p>
                </div>
            )}
      </div>

      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Kayıt" actions={<button onClick={handleAddStudent} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">Kaydet</button>}>
        <div className="flex flex-col gap-3 py-2">
            <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="İsim Soyisim" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="Telefon" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
            <input type="number" value={newFee} onChange={e=>setNewFee(e.target.value)} placeholder="Aylık Ücret" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" />
        </div>
      </Dialog>

      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Kaydı Sil" actions={<button onClick={() => { if(deleteId) actions.deleteStudent(deleteId); setDeleteId(null); }} className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm">Sil</button>}>
        <p className="text-slate-500 text-sm font-medium">Bu öğrenci ve tüm geçmişi silinecek. Emin misiniz?</p>
      </Dialog>
    </div>
  );
};
