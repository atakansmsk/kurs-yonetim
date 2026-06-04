
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student, Transaction, DAYS } from '../types';
import { Trash2, Search, UserPlus, AlertCircle, CheckCircle2, Clock, UserCheck, UserMinus, ChevronRight, CreditCard, Users, Filter, Layers, AlertTriangle, Banknote, Eye, EyeOff } from 'lucide-react';
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
  const [showEarnings, setShowEarnings] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("");

  const now = new Date();

  // Yardımcı Fonksiyon: Son ödemeden sonraki geçerli ders sayısını hesaplar
  const getUnpaidLessonCount = (student: Student): number => {
      if (!student.history || student.history.length === 0) return 0;
      const history = [...student.history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let counter = 0;
      history.forEach(tx => {
          if (!tx.isDebt) counter = 0;
          else {
              const lowerNote = (tx.note || "").toLowerCase();
              const isValidLesson = !lowerNote.includes("gelmedi") && 
                                    !lowerNote.includes("katılım yok") && 
                                    !lowerNote.includes("iptal") &&
                                    !lowerNote.includes("telafi bekliyor");
              if (isValidLesson) {
                  const weight = tx.lessonCount !== undefined ? tx.lessonCount : 1;
                  counter += weight;
              }
          }
      });
      return counter;
  };

  const { debtors, paidStudents, exemptStudents, inactiveStudents, stats, monthlyEarnings } = useMemo(() => {
      const allStudents = Object.values(state.students || {}) as Student[];

      let debtorsList: (Student & { unpaidCount: number })[] = [];
      let paidList: (Student & { unpaidCount: number })[] = [];
      let exemptList: (Student & { unpaidCount: number })[] = [];
      let inactiveList: (Student & { unpaidCount: number })[] = [];
      let totalExpectedDebt = 0;
      
      // Aylık Ciro Hesabı (Haftalık programa kayıtlı benzersiz öğrencilerin toplam fee tutarı)
      const scheduledStudentIds = new Set<string>();
      DAYS.forEach(day => {
          const key = `${state.currentTeacher}|${day}`;
          (state.schedule[key] || []).forEach(slot => {
              if (slot.studentId) scheduledStudentIds.add(slot.studentId);
          });
      });

      let earnings = 0;
      scheduledStudentIds.forEach(id => {
          const s = state.students[id];
          if (s) earnings += s.fee || 0;
      });

      allStudents.forEach(student => {
          const unpaidCount = getUnpaidLessonCount(student);

          if (student.isActive === false) {
              inactiveList.push({ ...student, unpaidCount });
          } else if (student.fee === 0) {
              exemptList.push({ ...student, unpaidCount });
          } else {
              const isDebtor = unpaidCount >= 4;
              if (isDebtor) {
                  debtorsList.push({ ...student, unpaidCount });
                  totalExpectedDebt += student.fee;
              } else {
                  paidList.push({ ...student, unpaidCount });
              }
          }
      });

      const filterFn = (s: Student) => s.name.toLowerCase().includes(search.toLowerCase());
      
      return {
          debtors: debtorsList.filter(filterFn).sort((a, b) => b.unpaidCount - a.unpaidCount),
          paidStudents: paidList.filter(filterFn).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
          exemptStudents: exemptList.filter(filterFn).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
          inactiveStudents: inactiveList.filter(filterFn).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
          stats: { totalExpectedDebt, countDebtors: debtorsList.length, countPaid: paidList.length + exemptList.length },
          monthlyEarnings: earnings
      };
  }, [state.students, state.schedule, state.currentTeacher, search]);

  const handleAddStudent = () => {
      if(newName.trim()) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
      }
  };

  const handleConfirmDelete = () => {
      if (deleteId) {
          actions.deleteStudent(deleteId);
          setDeleteId(null);
      }
  };

  const renderStudentRow = (student: Student & { unpaidCount: number }, type: 'DEBTORS' | 'PAID' | 'EXEMPT' | 'INACTIVE') => {
      let avatarClass = "bg-emerald-50 text-emerald-600";
      if (type === 'DEBTORS') {
          avatarClass = "bg-rose-50 text-rose-600";
      } else if (type === 'EXEMPT') {
          avatarClass = "bg-[#EBFDFA] text-emerald-600";
      } else if (type === 'INACTIVE') {
          avatarClass = "bg-slate-100 text-slate-400";
      }

      return (
          <div 
              key={student.id} 
              className={`bg-white rounded-[1.25rem] p-2.5 shadow-sm border border-slate-100/80 flex items-center gap-3 cursor-pointer active:scale-[0.98] hover:border-indigo-200 transition-all animate-in slide-in-from-bottom-2 ${
                  type === 'INACTIVE' ? 'opacity-[0.7] border-slate-100' : ''
              }`}
              onClick={() => onSelect(student.id)}
          >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-inner shrink-0 ${avatarClass}`}>
                  {student.name.charAt(0).toUpperCase()}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-800 truncate text-[12.5px] tracking-tight leading-none mb-1">{student.name}</h4>
                  <div className="flex items-center gap-2">
                      {type === 'EXEMPT' ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border bg-emerald-50 border-emerald-100 text-emerald-600">
                              <Layers size={9} />
                              MUAF
                          </span>
                      ) : type === 'INACTIVE' ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border bg-slate-100 border-slate-200/60 text-slate-400">
                              <Layers size={9} />
                              PASİF
                          </span>
                      ) : (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border ${
                              student.unpaidCount >= 4 ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                              student.unpaidCount > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 
                              'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                              <Layers size={9} />
                              {Number(student.unpaidCount.toFixed(1))} Ders
                          </span>
                      )}
                      
                      {student.fee > 0 && student.unpaidCount >= 4 && type !== 'INACTIVE' && (
                          <span className="text-[7.5px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50/60 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                              Ödeme Vakti
                          </span>
                      )}
                  </div>
              </div>
              <div className="text-slate-300">
                  <ChevronRight size={16} />
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-lg px-6 pt-8 pb-4 sticky top-0 z-30 border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Öğrenci Rehberi</h2>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Kayıt ve Ödeme Takibi</span>
                </div>
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="w-11 h-11 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center active:scale-95 transition-all group"
            >
                <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Quick Stats Panel - 3 Sütunlu Yapı */}
          <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block mb-1">BEKLEYEN</span>
                  <span className="text-sm font-black text-slate-800">{stats.totalExpectedDebt.toLocaleString()} ₺</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">AYLIK CİRO</span>
                    <button onClick={() => setShowEarnings(!showEarnings)} className="text-emerald-400">
                        {showEarnings ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                  </div>
                  <span className="text-sm font-black text-emerald-700">
                    {showEarnings ? `${monthlyEarnings.toLocaleString()} ₺` : '*** ₺'}
                  </span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest block mb-1">DÜZENLİ</span>
                  <span className="text-sm font-black text-slate-800">{stats.countPaid} Kişi</span>
              </div>
          </div>
          
          {/* Search Input */}
          <div className="relative mb-5 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                placeholder="Öğrenci ara..."
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button 
                onClick={() => setActiveTab('DEBTORS')}
                className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${activeTab === 'DEBTORS' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                  <AlertTriangle size={14} className={activeTab === 'DEBTORS' ? 'text-rose-500' : ''} /> Bekleyen ({debtors.length})
              </button>
              <button 
                onClick={() => setActiveTab('PAID')}
                className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${activeTab === 'PAID' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                  <CheckCircle2 size={14} className={activeTab === 'PAID' ? 'text-emerald-500' : ''} /> Diğer ({paidStudents.length + exemptStudents.length + inactiveStudents.length})
              </button>
          </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-32 space-y-4 no-scrollbar">
            {activeTab === 'DEBTORS' ? (
                 debtors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                             <Users size={32} />
                          </div>
                          <p className="font-bold text-slate-400 text-sm">Liste şu an boş.</p>
                          <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">
                             Ödeme bekleyen öğrenci yok.
                          </p>
                      </div>
                 ) : (
                     <div className="space-y-3">
                         <div className="flex items-center gap-2 px-1 mb-2">
                             <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Bekleyen Ödemeler ({debtors.length})</span>
                             <div className="h-[1px] bg-slate-200/60 flex-1"></div>
                         </div>
                         {debtors.map(student => renderStudentRow(student, 'DEBTORS'))}
                     </div>
                 )
            ) : (
                 (paidStudents.length === 0 && exemptStudents.length === 0 && inactiveStudents.length === 0) ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                             <Users size={32} />
                          </div>
                          <p className="font-bold text-slate-400 text-sm">Liste şu an boş.</p>
                          <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">
                             Kayıtlı öğrenci bulunamadı.
                          </p>
                      </div>
                 ) : (
                      <div className="space-y-6">
                          {/* Ödemesi Tamam Öğrenciler */}
                          {paidStudents.length > 0 && (
                              <div className="space-y-3">
                                  <div className="flex items-center gap-2 px-1 mb-1">
                                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Ödemesi Düzenli ({paidStudents.length})</span>
                                      <div className="h-[1px] bg-slate-200/60 flex-1"></div>
                                  </div>
                                  <div className="space-y-3 animate-in fade-in duration-300">
                                      {paidStudents.map(student => renderStudentRow(student, 'PAID'))}
                                  </div>
                              </div>
                          )}

                          {/* Muaf Öğrenciler */}
                          {exemptStudents.length > 0 && (
                              <div className="space-y-3">
                                  <div className="flex items-center gap-2 px-1 mb-1">
                                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Muaf Öğrenciler ({exemptStudents.length})</span>
                                      <div className="h-[1px] bg-emerald-100/60 flex-1"></div>
                                  </div>
                                  <div className="space-y-3 animate-in fade-in duration-350">
                                      {exemptStudents.map(student => renderStudentRow(student, 'EXEMPT'))}
                                  </div>
                              </div>
                          )}

                          {/* Pasif (Aktif Olmayan) Öğrenciler */}
                          {inactiveStudents.length > 0 && (
                              <div className="space-y-3">
                                  <div className="flex items-center gap-2 px-1 mb-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pasif Öğrenciler ({inactiveStudents.length})</span>
                                      <div className="h-[1px] bg-slate-200/50 flex-1"></div>
                                  </div>
                                  <div className="space-y-3 animate-in fade-in duration-400">
                                      {inactiveStudents.map(student => renderStudentRow(student, 'INACTIVE'))}
                                  </div>
                              </div>
                          )}
                      </div>
                 )
            )}
      </div>

      {/* MODALS */}
      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Öğrenci" actions={<button onClick={handleAddStudent} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">Kaydı Tamamla</button>}>
        <div className="flex flex-col gap-4 py-2">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">İsim Soyisim</label>
                <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Örn: Ali Yılmaz" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
                <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="05..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paket Ücreti (₺)</label>
                <input type="number" value={newFee} onChange={e=>setNewFee(e.target.value)} placeholder="1500" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" />
            </div>
        </div>
      </Dialog>
    </div>
  );
};
