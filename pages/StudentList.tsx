
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student, Transaction } from '../types';
// Fixed: Added AlertTriangle to the imports from lucide-react
import { Trash2, Search, UserPlus, AlertCircle, CheckCircle2, Clock, UserCheck, UserMinus, ChevronRight, CreditCard, Users, Filter, Layers, AlertTriangle } from 'lucide-react';
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
  const monthName = now.toLocaleDateString('tr-TR', { month: 'long' });

  // Yardımcı Fonksiyon: Son ödemeden sonraki geçerli ders sayısını hesaplar
  const getUnpaidLessonCount = (student: Student): number => {
      if (!student.history || student.history.length === 0) return 0;

      // Geçmişi eskiden yeniye sırala
      const history = [...student.history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let counter = 0;
      history.forEach(tx => {
          if (!tx.isDebt) {
              counter = 0; // Ödeme varsa sayacı sıfırla
          } else {
              const lowerNote = (tx.note || "").toLowerCase();
              const isValidLesson = !lowerNote.includes("gelmedi") && 
                                    !lowerNote.includes("katılım yok") && 
                                    !lowerNote.includes("iptal") &&
                                    !lowerNote.includes("telafi bekliyor");
              if (isValidLesson) counter++;
          }
      });
      return counter;
  };

  const { debtors, paidStudents, stats } = useMemo(() => {
      const allStudents = Object.values(state.students || {}) as Student[];
      const visibleStudents = allStudents.filter(s => s.isActive !== false);

      let debtorsList: (Student & { unpaidCount: number })[] = [];
      let paidList: (Student & { unpaidCount: number })[] = [];
      let totalExpected = 0;
      let totalCollected = 0;

      visibleStudents.forEach(student => {
          const unpaidCount = getUnpaidLessonCount(student);
          
          // MANTIK: 
          // 1. Ücreti 0 olanlar her zaman "Ödeyen" listesinde.
          // 2. 4 ders veya daha fazla ders biriktirenler "Bekleyen" listesinde.
          // 3. 4 dersten az dersi olanlar "Ödeyen/Güvenli" listesinde.
          
          const isDebtor = student.fee > 0 && unpaidCount >= 4;

          if (isDebtor) {
              debtorsList.push({ ...student, unpaidCount });
              totalExpected += student.fee;
          } else {
              paidList.push({ ...student, unpaidCount });
              if (student.fee > 0 && unpaidCount === 0) {
                  // Bu ay veya son periyotta ödeme yapmış olanların toplamı (İsteğe bağlı istatistik)
                  totalCollected += student.fee;
              }
          }
      });

      const filterFn = (s: Student) => s.name.toLowerCase().includes(search.toLowerCase());
      
      return {
          debtors: debtorsList.filter(filterFn).sort((a, b) => b.unpaidCount - a.unpaidCount),
          paidStudents: paidList.filter(filterFn).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
          stats: { totalExpected, totalCollected, countDebtors: debtorsList.length, countPaid: paidList.length }
      };
  }, [state.students, search]);

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

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-lg px-6 pt-8 pb-4 sticky top-0 z-30 border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Öğrenci Rehberi</h2>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">4 Ders Paket Takibi</span>
                </div>
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)} 
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all group"
            >
                <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase tracking-wider">Yeni Kayıt</span>
            </button>
          </div>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-[-10px] right-[-10px] opacity-5 group-hover:scale-110 transition-transform">
                      <Clock size={64} />
                  </div>
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-1">BORÇLU (4+ Ders)</span>
                  <span className="text-xl font-black text-slate-800">{stats.totalExpected.toLocaleString()} ₺</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-[-10px] right-[-10px] opacity-5 group-hover:scale-110 transition-transform">
                      <UserCheck size={64} />
                  </div>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">DÜZENLİ / MUAF</span>
                  <span className="text-xl font-black text-slate-800">{stats.countPaid} Kişi</span>
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
                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button 
                onClick={() => setActiveTab('DEBTORS')}
                className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${activeTab === 'DEBTORS' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                  <AlertTriangle size={14} className={activeTab === 'DEBTORS' ? 'text-rose-500' : ''} /> Bekleyen ({debtors.length})
              </button>
              <button 
                onClick={() => setActiveTab('PAID')}
                className={`flex-1 py-2.5 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${activeTab === 'PAID' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                  <CheckCircle2 size={14} className={activeTab === 'PAID' ? 'text-emerald-500' : ''} /> Tamam ({paidStudents.length})
              </button>
          </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-32 space-y-3 no-scrollbar">
            {(activeTab === 'DEBTORS' ? debtors : paidStudents).length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                     <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <Users size={32} />
                     </div>
                     <p className="font-bold text-slate-400 text-sm">Liste şu an boş.</p>
                     <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">
                        {activeTab === 'DEBTORS' ? '4 dersi tamamlamış öğrenci yok.' : 'Kayıtlı öğrenci bulunamadı.'}
                     </p>
                 </div>
            ) : (
                (activeTab === 'DEBTORS' ? debtors : paidStudents).map(student => (
                    <div 
                        key={student.id} 
                        className="bg-white rounded-[1.75rem] p-4 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer active:scale-[0.98] hover:border-indigo-200 transition-all animate-in slide-in-from-bottom-2"
                        onClick={() => onSelect(student.id)}
                    >
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${activeTab === 'DEBTORS' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {student.name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-slate-800 truncate text-[15px] tracking-tight leading-none mb-2">{student.name}</h4>
                            <div className="flex items-center gap-2">
                                {/* Lesson Counter Badge */}
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border ${
                                    student.unpaidCount >= 4 ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                                    student.unpaidCount > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 
                                    'bg-emerald-50 border-emerald-100 text-emerald-600'
                                }`}>
                                    <Layers size={10} />
                                    {student.fee === 0 ? "MUAF" : `${student.unpaidCount} Ders`}
                                </span>

                                {student.fee > 0 && student.unpaidCount >= 4 && (
                                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded animate-pulse">
                                        Ödeme Vakti
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                            <div className="text-slate-300">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </div>
                ))
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

      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Öğrenciyi Sil" actions={<button onClick={handleConfirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 active:scale-95 transition-all">Kesin Olarak Sil</button>}>
        <div className="py-2">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
            </div>
            <p className="text-slate-800 text-sm font-bold text-center leading-relaxed">Bu öğrenciyi ve tüm program kayıtlarını silmek istediğinizden emin misiniz?</p>
            <p className="text-rose-500 text-[10px] font-black mt-3 text-center uppercase tracking-widest">BU İŞLEM GERİ ALINAMAZ</p>
        </div>
      </Dialog>
    </div>
  );
};
