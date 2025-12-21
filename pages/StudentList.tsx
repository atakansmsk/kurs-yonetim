
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student, Transaction } from '../types';
import { Trash2, Search, UserPlus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface StudentListProps {
    onSelect: (id: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onSelect }) => {
  const { state, actions } = useCourse();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("");

  // Helper to calculate lessons since last payment
  const getDebtStatus = (student: Student) => {
    if (!student.history || student.history.length === 0) return 0;

    const sortedHistory = [...student.history].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastPaymentIndex = sortedHistory.findIndex(tx => !tx.isDebt);
    
    // If there's a payment, only look at transactions after it
    const relevantHistory = lastPaymentIndex !== -1 
        ? sortedHistory.slice(0, lastPaymentIndex) 
        : sortedHistory;

    // Count valid lessons (isDebt: true and not canceled/absent)
    return relevantHistory.filter(tx => {
        if (!tx.isDebt) return false;
        const note = (tx.note || "").toLowerCase();
        return !note.includes("gelmedi") && 
               !note.includes("katılım yok") && 
               !note.includes("iptal") &&
               !note.includes("telafi bekliyor");
    }).length;
  };

  const filteredStudents = useMemo(() => {
      const allStudents = state.students ? Object.values(state.students) : [];
      let list = allStudents as Student[];
      
      if (search) {
          list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
      }
      
      return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [state.students, search]);

  const handleAddStudent = () => {
      if(newName.trim()) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
      }
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <div className="bg-white px-5 pt-8 pb-4 sticky top-0 z-20 shadow-sm border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Öğrenci Rehberi</h2>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {filteredStudents.length} Kayıt Bulundu
                    </span>
                </div>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <UserPlus size={24} />
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                placeholder="Öğrenci ismi ile ara..."
                className="block w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:bg-white transition-all shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {filteredStudents.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center">
                     <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                         <AlertCircle size={32} />
                     </div>
                     <p className="font-bold text-slate-400 text-sm">Hala liste boş görünüyorsa<br/>lütfen sayfayı yenileyin.</p>
                 </div>
            ) : (
                filteredStudents.map(student => {
                    const debtCount = getDebtStatus(student);
                    return (
                        <div 
                            key={student.id} 
                            className={`group bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all ${student.isActive === false ? 'opacity-50 border-slate-100 bg-slate-50' : 'border-slate-100'}`}
                            onClick={() => onSelect(student.id)}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${student.isActive === false ? 'bg-slate-200 text-slate-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                {student.name.charAt(0).toUpperCase()}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 truncate leading-tight">{student.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                        {student.fee} TL
                                    </span>
                                    {student.isActive !== false && (
                                        debtCount > 0 ? (
                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md text-[9px] font-black border border-red-100">
                                                <Clock size={10} /> {debtCount} DERS BORÇ
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black border border-emerald-100">
                                                <CheckCircle2 size={10} /> ÖDENDİ
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    );
                })
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
        <p className="text-slate-500 text-sm font-medium">Bu işlem geri alınamaz. Emin misiniz?</p>
      </Dialog>
    </div>
  );
};
