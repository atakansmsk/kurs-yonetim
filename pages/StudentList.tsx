import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student, LessonSlot } from '../types';
import { Trash2, Search, UserPlus, MessageSquare, Copy, Send, MessageCircle, Banknote, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertTriangle, Archive, RefreshCw, UserMinus } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface StudentListProps {
    onSelect: (id: string) => void;
}

type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

const STUDENT_COLORS = [
    { key: 'indigo', label: 'Mavi', hex: '#6366f1' },
    { key: 'rose', label: 'Kırmızı', hex: '#f43f5e' },
    { key: 'emerald', label: 'Yeşil', hex: '#10b981' },
    { key: 'amber', label: 'Turuncu', hex: '#f59e0b' },
    { key: 'cyan', label: 'Turkuaz', hex: '#06b6d4' },
    { key: 'purple', label: 'Mor', hex: '#8b5cf6' },
];

export const StudentList: React.FC<StudentListProps> = ({ onSelect }) => {
  const { state, actions } = useCourse();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newRegDate, setNewRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [newColor, setNewColor] = useState("indigo");

  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkTarget, setBulkTarget] = useState<'ALL' | 'UNPAID'>('UNPAID');

  const currentDate = new Date();
  const currentDay = currentDate.getDate(); 
  const currentMonth = currentDate.getMonth(); 
  const currentYear = currentDate.getFullYear();
  const isCriticalPeriod = currentDay >= 1 && currentDay <= 5;

  // --- PROGRAMDA DERSİ OLAN ÖĞRENCİLERİ BUL ---
  const assignedStudentIds = useMemo(() => {
      const ids = new Set<string>();
      // FIX: Cast Object.values to LessonSlot[][] to prevent 'unknown' type inference error on forEach
      (Object.values(state.schedule) as LessonSlot[][]).forEach(slots => {
          slots.forEach(slot => {
              if (slot.studentId) ids.add(slot.studentId);
          });
      });
      return ids;
  }, [state.schedule]);

  const getPaymentStatus = (student: Student): PaymentStatus => {
      if (student.fee <= 0) return 'PAID';
      const thisMonthPayments = student.history.filter(tx => {
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
      let list = (Object.values(state.students) as Student[]);

      if (search) {
          list = list.filter((s: Student) => s.name.toLowerCase().includes(search.toLowerCase()));
      }

      // 2. Aktif/Pasif Filtresi
      list = list.filter((s: Student) => {
          const isActive = s.isActive !== false;
          const isCurrentlyBrowsingActive = viewMode === 'ACTIVE';
          
          if (isCurrentlyBrowsingActive) {
              // ANA LİSTEDE: Sadece aktif olan ve ders ataması olanları göster
              return isActive && assignedStudentIds.has(s.id);
          } else {
              // ARŞİVDE: Pasif olanları veya aktif olsa bile ders ataması olmayanları göster
              return !isActive || !assignedStudentIds.has(s.id);
          }
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
  }, [state.students, search, viewMode, assignedStudentIds]);

  const totalActiveInPayments = unpaidStudents.length + paidStudents.length;

  const handleAddStudent = () => {
      if(newName.trim()) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0, newRegDate, newColor);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
      }
  }

  const getCleanNumbers = () => {
      const targetList = bulkTarget === 'UNPAID' ? unpaidStudents : [...unpaidStudents, ...paidStudents];
      return targetList.map(s => s.phone.replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
  };

  const renderStudentRow = (student: Student, isPaidList: boolean) => {
    const status = getPaymentStatus(student);
    const isInactive = student.isActive === false;
    const hasNoLessons = !assignedStudentIds.has(student.id);
    
    let avatarBg = 'bg-slate-50 text-slate-600';
    let badgeText = '';
    let badgeColorClass = 'text-slate-500';

    if (isInactive) {
        avatarBg = 'bg-slate-100 text-slate-400';
        badgeText = 'Ayrıldı';
        badgeColorClass = 'text-slate-400';
    } else if (hasNoLessons) {
        avatarBg = 'bg-amber-50 text-amber-600';
        badgeText = 'Programda Yok';
        badgeColorClass = 'text-amber-500';
    } else if (isPaidList) {
        avatarBg = 'bg-emerald-50 text-emerald-600';
        badgeText = 'Ödendi';
        badgeColorClass = 'text-emerald-500';
    } else {
        if (status === 'PARTIAL') {
            avatarBg = 'bg-orange-50 text-orange-600';
            badgeText = 'Eksik Ödeme';
            badgeColorClass = 'text-orange-500';
        } else {
            avatarBg = 'bg-red-50 text-red-600';
            badgeText = isCriticalPeriod ? 'Gecikti' : 'Bekliyor';
            badgeColorClass = isCriticalPeriod ? 'text-red-500' : 'text-amber-500';
        }
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
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ödemeler</h2>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-bold text-slate-400">{totalActiveInPayments} Aktif Takip</p>
                    <button 
                        onClick={() => setViewMode(prev => prev === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE')}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${viewMode === 'ARCHIVED' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                    >
                        {viewMode === 'ACTIVE' ? <Archive size={12} /> : <RefreshCw size={12} />}
                        {viewMode === 'ACTIVE' ? 'Arşiv / Pasif' : 'Geri Dön'}
                    </button>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setIsBulkModalOpen(true)} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                    <MessageSquare size={20} />
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                    <UserPlus size={20} />
                </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
            </div>
            <input 
                type="text" 
                placeholder="Öğrenci ara..."
                className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {viewMode === 'ARCHIVED' ? (
             <div className="space-y-2">
                 <div className="bg-slate-100 p-3 rounded-xl text-center mb-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ARŞİVDEKİLER & PROGRAMDA OLMAYANLAR</p>
                 </div>
                 {[...unpaidStudents, ...paidStudents].length === 0 ? (
                     <div className="text-center py-20 opacity-30">
                         <UserMinus size={48} className="mx-auto mb-3 text-slate-400" />
                         <p className="font-bold text-slate-500">Arşivde kimse yok.</p>
                     </div>
                 ) : (
                     [...unpaidStudents, ...paidStudents].map(s => renderStudentRow(s, false))
                 )}
             </div>
        ) : (
            <>
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest px-1">ÖDEME BEKLEYENLER ({unpaidStudents.length})</h3>
                    {unpaidStudents.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 border-dashed opacity-50">
                            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600">Herkes ödedi, tebrikler!</p>
                        </div>
                    ) : unpaidStudents.map(s => renderStudentRow(s, false))}
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">BU AY ÖDEYENLER ({paidStudents.length})</h3>
                    {paidStudents.map(s => renderStudentRow(s, true))}
                </div>
            </>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Silinsin mi?" actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-slate-500 font-bold text-sm">Vazgeç</button>
            <button onClick={() => { if(deleteId) actions.deleteStudent(deleteId); setDeleteId(null); }} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm">Evet, Sil</button>
          </>
        }
      >
        <p className="text-slate-600 text-sm font-medium">Bu öğrenciyi sistemden tamamen silmek istediğinize emin misiniz? Arşivlemek için profilden Pasif yapabilirsiniz.</p>
      </Dialog>
      
      {/* Diğer Modallar (Ekleme, SMS) burada devam eder, aynı kaldılar */}
    </div>
  );
};