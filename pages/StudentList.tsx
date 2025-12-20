
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student } from '../types';
import { Trash2, Search, UserPlus, MessageSquare, Archive, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface StudentListProps {
    onSelect: (id: string) => void;
}

type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export const StudentList: React.FC<StudentListProps> = ({ onSelect }) => {
  const { state, actions } = useCourse();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("");

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const getPaymentStatus = (student: Student): PaymentStatus => {
      if (student.fee <= 0) return 'PAID';
      const thisMonthPayments = (student.history || []).filter(tx => {
          if (tx.isDebt) return false;
          const txDate = new Date(tx.date);
          return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });
      const totalPaid = thisMonthPayments.reduce((acc, curr) => acc + curr.amount, 0);
      if (totalPaid >= student.fee) return 'PAID';
      if (totalPaid === 0) return 'UNPAID';
      return 'PARTIAL';
  };

  const { unpaidStudents, paidStudents } = useMemo(() => {
      let list = (Object.values(state.students || {}) as Student[]);

      if (search) {
          list = list.filter((s: Student) => s.name.toLowerCase().includes(search.toLowerCase()));
      }

      // Filter by Active/Archived only, don't hide if not in schedule
      list = list.filter((s: Student) => {
          const isActive = s.isActive !== false;
          return viewMode === 'ACTIVE' ? isActive : !isActive;
      });

      const unpaid: Student[] = [];
      const paid: Student[] = [];

      list.forEach(student => {
          if (getPaymentStatus(student) === 'PAID') paid.push(student);
          else unpaid.push(student);
      });

      unpaid.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      paid.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

      return { unpaidStudents: unpaid, paidStudents: paid };
  }, [state.students, search, viewMode]);

  const handleAddStudent = () => {
      if(newName.trim()) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
      }
  }

  const renderStudentRow = (student: Student, isPaidList: boolean) => {
    const status = getPaymentStatus(student);
    const isInactive = student.isActive === false;
    
    let avatarBg = 'bg-slate-50 text-slate-600';
    let badgeText = isPaidList ? 'Ödendi' : 'Ödeme Bekliyor';
    let badgeColorClass = isPaidList ? 'text-emerald-500' : 'text-rose-500';

    if (isInactive) {
        avatarBg = 'bg-slate-100 text-slate-400';
        badgeText = 'Ayrıldı';
        badgeColorClass = 'text-slate-400';
    } else if (status === 'PARTIAL') {
        avatarBg = 'bg-orange-50 text-orange-600';
        badgeText = 'Eksik Ödeme';
        badgeColorClass = 'text-orange-500';
    }

    return (
        <div 
            key={student.id} 
            className="group relative bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => onSelect(student.id)}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${avatarBg}`}>
                {student.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm truncate leading-tight ${isInactive ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{student.name}</h4>
                <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${badgeColorClass}`}>{badgeText}</p>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] pb-20">
      <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-20 shadow-sm border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Öğrenciler</h2>
                <button 
                    onClick={() => setViewMode(prev => prev === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')}
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 mt-1 ${viewMode === 'ARCHIVED' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                >
                    {viewMode === 'ACTIVE' ? <Archive size={12} /> : <RefreshCw size={12} />}
                    {viewMode === 'ACTIVE' ? 'Arşivlenenler' : 'Geri Dön'}
                </button>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                <UserPlus size={20} />
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                placeholder="İsim ile ara..."
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tüm Liste ({unpaidStudents.length + paidStudents.length})</h3>
            {unpaidStudents.map(s => renderStudentRow(s, false))}
            {paidStudents.map(s => renderStudentRow(s, true))}
            {unpaidStudents.length + paidStudents.length === 0 && (
                 <div className="text-center py-20 opacity-30">
                     <p className="font-bold text-slate-500">Öğrenci bulunamadı.</p>
                 </div>
            )}
        </div>
      </div>

      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Öğrenci Ekle" actions={<><button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleAddStudent} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Kaydet</button></>}>
        <div className="flex flex-col gap-3 py-2">
            <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="İsim Soyisim" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
            <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="Telefon" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
            <input type="number" value={newFee} onChange={e=>setNewFee(e.target.value)} placeholder="Aylık Ücret" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none" />
        </div>
      </Dialog>

      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Öğrenciyi Sil" actions={<><button onClick={() => setDeleteId(null)} className="px-4 py-2 text-slate-500 font-bold text-sm">Vazgeç</button><button onClick={() => { if(deleteId) actions.deleteStudent(deleteId); setDeleteId(null); }} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm">Sil</button></>}>
        <p className="text-slate-600 text-sm font-medium">Bu öğrenciyi ve tüm geçmişini silmek istediğinize emin misiniz?</p>
      </Dialog>
    </div>
  );
};
