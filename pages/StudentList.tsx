
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student } from '../types';
import { Trash2, Search, UserPlus, MessageSquare, Copy, Send, MessageCircle, Banknote, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // New Student Form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newRegDate, setNewRegDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk Message
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkTarget, setBulkTarget] = useState<'ALL' | 'UNPAID'>('UNPAID');

  // --- ÖDEME DURUMU MANTIĞI ---
  const currentDate = new Date();
  const currentDay = currentDate.getDate(); // Ayın kaçı (1-31)
  const currentMonth = currentDate.getMonth(); // 0-11
  const currentYear = currentDate.getFullYear();
  
  // Ayın 1'i ile 5'i arası kritik dönem mi?
  const isCriticalPeriod = currentDay >= 1 && currentDay <= 5;

  const getPaymentStatus = (student: Student): PaymentStatus => {
      // KURAL 1: Ücret <= 0 ise ödenmiş say.
      if (student.fee <= 0) return 'PAID';

      // KURAL 2: Bu ay yapılan ödemeleri topla.
      const thisMonthPayments = student.history.filter(tx => {
          if (tx.isDebt) return false;
          const txDate = new Date(tx.date);
          return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });

      const totalPaid = thisMonthPayments.reduce((acc, curr) => acc + curr.amount, 0);

      // KURAL 3: Toplam Ödeme >= Aylık Ücret ise TAMAM
      if (totalPaid >= student.fee) {
          return 'PAID';
      }
      // KURAL 4: Hiç ödeme yoksa
      if (totalPaid === 0) {
          return 'UNPAID';
      }
      // KURAL 5: Eksik ödeme varsa (0 < ödenen < ücret)
      return 'PARTIAL';
  };

  // --- LİSTE AYRIŞTIRMA ---
  const { unpaidStudents, paidStudents } = useMemo(() => {
      let list = (Object.values(state.students) as Student[]);

      // 1. İsim Araması
      if (search) {
          list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
      }

      const unpaid: Student[] = [];
      const paid: Student[] = [];

      list.forEach(student => {
          if (getPaymentStatus(student) === 'PAID') {
              paid.push(student);
          } else {
              unpaid.push(student);
          }
      });

      // Sıralama: 
      // Unpaid listesinde: Önce KISMİ ödeyenler, sonra tamamen ödemeyenler, sonra isme göre.
      unpaid.sort((a, b) => {
          const statusA = getPaymentStatus(a);
          const statusB = getPaymentStatus(b);
          
          if (statusA === 'PARTIAL' && statusB !== 'PARTIAL') return -1;
          if (statusB === 'PARTIAL' && statusA !== 'PARTIAL') return 1;
          
          return a.name.localeCompare(b.name, 'tr');
      });

      paid.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

      return { unpaidStudents: unpaid, paidStudents: paid };
  }, [state.students, search]);

  // İstatistikler
  const totalStudents = Object.keys(state.students).length;

  const handleAddStudent = () => {
      if(newName.trim()) {
          const feeValue = parseFloat(newFee.replace(',', '.')) || 0;
          actions.addStudent(newName, newPhone, feeValue, newRegDate);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
          setNewRegDate(new Date().toISOString().split('T')[0]);
      }
  }

  const getCleanNumbers = () => {
      // Hedef kitleye göre numaraları filtrele
      const targetList = bulkTarget === 'UNPAID' ? unpaidStudents : [...unpaidStudents, ...paidStudents];
      
      return targetList
        .map(s => s.phone.replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 7);
  };

  const handleCopyNumbers = () => {
      const numbers = getCleanNumbers().join(', ');
      navigator.clipboard.writeText(numbers);
      alert(`${getCleanNumbers().length} numara kopyalandı!`);
  };

  const handleBulkSMS = () => {
      const numbers = getCleanNumbers().join(',');
      if (!numbers) return;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const separator = isIOS ? '&' : '?';
      const url = `sms:${numbers}${separator}body=${encodeURIComponent(bulkMessage)}`;
      window.open(url, '_self');
  };

  const renderStudentRow = (student: Student, isPaidList: boolean) => {
    const status = getPaymentStatus(student);
    const isPartial = status === 'PARTIAL';
    
    // Determine colors
    let borderColor = 'border-slate-100 hover:border-slate-300';
    let avatarBg = 'bg-slate-50 text-slate-600';
    let badgeText = '';
    let BadgeIcon = AlertCircle;
    let badgeColorClass = 'text-slate-500';

    if (isPaidList) {
        borderColor = 'border-emerald-100 hover:border-emerald-300';
        avatarBg = 'bg-emerald-50 text-emerald-600';
        badgeText = 'Ödendi';
        BadgeIcon = CheckCircle2;
        badgeColorClass = 'text-emerald-500';
    } else {
        // Unpaid or Partial
        if (isPartial) {
            borderColor = 'border-orange-100 hover:border-orange-300';
            avatarBg = 'bg-orange-50 text-orange-600';
            badgeText = 'Kısmi Ödeme (Eksik)';
            BadgeIcon = AlertTriangle;
            badgeColorClass = 'text-orange-500';
        } else {
            borderColor = 'border-red-100 hover:border-red-300';
            avatarBg = 'bg-red-50 text-red-600';
            badgeText = isCriticalPeriod ? 'Gecikti' : 'Bekliyor';
            BadgeIcon = isCriticalPeriod ? AlertCircle : Clock;
            badgeColorClass = isCriticalPeriod ? 'text-red-500' : 'text-amber-500';
        }
    }

    return (
        <div 
            key={student.id} 
            className={`group relative bg-white rounded-lg p-2 shadow-sm border transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-[0.99] hover:shadow-md ${borderColor}`}
            onClick={() => onSelect(student.id)}
        >
            {/* Avatar - Daha küçük (w-8 h-8) */}
            <div className="relative shrink-0">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center font-black text-xs shrink-0 border border-transparent ${avatarBg}`}>
                    {student.name.charAt(0).toUpperCase()}
                </div>
                {/* STATUS BADGE - Only for unpaid/partial */}
                {!isPaidList && (
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center border border-white ${
                        isPartial ? 'bg-orange-500 text-white' :
                        (isCriticalPeriod ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white')
                    }`}>
                        <BadgeIcon size={6} strokeWidth={4} />
                    </div>
                )}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs truncate pr-1 leading-tight">{student.name}</h4>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[8px] font-bold uppercase tracking-wide truncate leading-none ${badgeColorClass}`}>
                        {badgeText}
                    </span>
                    {/* Show remaining amount logic could go here if needed */}
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] pb-20">
      
      {/* 1. Header & Search (Sticky) */}
      <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-20 shadow-sm border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Öğrenci Listesi</h2>
                <p className="text-xs font-medium text-slate-400">{totalStudents} Kayıtlı Öğrenci</p>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setIsBulkModalOpen(true)} className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 hover:bg-indigo-100 transition-all">
                    <MessageSquare size={16} />
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-all">
                    <UserPlus size={16} />
                </button>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            </div>
            <input 
                type="text" 
                placeholder="İsim ile hızlı arama..." 
                className="block w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
          </div>
      </div>

      {/* 
          2. LIST CONTAINER 
          Mobile: Sayfa scroll olur, listeler alt alta gelir ve uzar.
          Desktop (lg): Sayfa sabit kalır, listeler yan yana gelir ve kendi içinde scroll olur.
      */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4">
        
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-4 lg:h-full">
            
            {/* --- LEFT: UNPAID/PARTIAL (RED/ORANGE) --- */}
            <div className="flex flex-col bg-red-50/30 rounded-xl border border-red-100/50 p-2 h-fit lg:h-full lg:min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between px-1 py-2 mb-1 border-b border-red-100/50">
                    <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        Ödeme Bekleyenler
                    </h3>
                    <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-bold">{unpaidStudents.length}</span>
                </div>

                {/* Content List */}
                <div className="flex-1 space-y-1.5 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
                    {unpaidStudents.length === 0 ? (
                        <div className="text-center py-8 opacity-40 flex flex-col items-center">
                             <CheckCircle2 size={24} className="text-red-300 mb-1" />
                             <p className="text-[10px] font-bold text-red-400">Herkes Ödedi!</p>
                        </div>
                    ) : (
                        unpaidStudents.map(s => renderStudentRow(s, false))
                    )}
                </div>
            </div>

            {/* --- RIGHT: PAID (GREEN) --- */}
            <div className="flex flex-col bg-emerald-50/30 rounded-xl border border-emerald-100/50 p-2 h-fit lg:h-full lg:min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between px-1 py-2 mb-1 border-b border-emerald-100/50">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        Ödeyenler
                    </h3>
                    <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold">{paidStudents.length}</span>
                </div>

                {/* Content List */}
                <div className="flex-1 space-y-1.5 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
                    {paidStudents.length === 0 ? (
                        <div className="text-center py-8 opacity-40 flex flex-col items-center">
                             <Clock size={24} className="text-emerald-300 mb-1" />
                             <p className="text-[10px] font-bold text-emerald-400">Henüz ödeme yok.</p>
                        </div>
                    ) : (
                        paidStudents.map(s => renderStudentRow(s, true))
                    )}
                </div>
            </div>

        </div>

      </div>

      {/* Add Student Modal */}
      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Öğrenci" 
        actions={
            <>
                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
                <button onClick={handleAddStudent} disabled={!newName.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 active:scale-95 transition-all">Kaydet</button>
            </>
        }
      >
          <div className="flex flex-col gap-3 py-1">
             <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Ad Soyad" autoFocus />
             <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Telefon" />
             
             <div className="flex gap-2">
                <input type="text" inputMode="decimal" value={newFee} onChange={e=>setNewFee(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Aylık Ücret (TL)" />
             </div>
             
             <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 ml-1">Kayıt Tarihi</label>
                <input type="date" value={newRegDate} onChange={e=>setNewRegDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" />
             </div>
          </div>
      </Dialog>

      {/* Bulk Message Modal (SMS) */}
      <Dialog isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Toplu SMS">
        <div className="flex flex-col gap-4 py-2">
            
            {/* Hedef Seçimi */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                    onClick={() => { setBulkTarget('UNPAID'); setBulkMessage("Sayın veli, ödeme hatırlatmasıdır. Bilginize."); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${bulkTarget === 'UNPAID' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400'}`}
                >
                    Ödeme Bekleyenler
                </button>
                <button 
                    onClick={() => { setBulkTarget('ALL'); setBulkMessage(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${bulkTarget === 'ALL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                >
                    Tüm Öğrenciler
                </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1">
                <span className="text-slate-600 text-xs font-medium">
                    {bulkTarget === 'UNPAID' ? `${unpaidStudents.length} kişiye gönderilecek (Ödeme Yapmayanlar)` : `${totalStudents} kişiye gönderilecek (Herkes)`}
                </span>
            </div>

            <button 
                onClick={handleBulkSMS}
                className="w-full py-4 bg-slate-900 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
                <MessageCircle size={18} /> Toplu SMS Başlat
            </button>

            <button 
                onClick={handleCopyNumbers}
                className="w-full py-2 bg-white border border-slate-200 text-slate-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
            >
                <Copy size={14} /> Numaraları Kopyala
            </button>

            <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Mesaj İçeriği</p>
                <textarea 
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Mesajınızı buraya yazın..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium h-24 resize-none mb-3 focus:border-indigo-500 outline-none"
                />
            </div>
        </div>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Silinsin mi?" actions={
          <>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">Vazgeç</button>
            <button onClick={() => { if(deleteId) actions.deleteStudent(deleteId); setDeleteId(null); }} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm shadow-md shadow-red-200">Sil</button>
          </>
        }
      >
        <p className="text-slate-600 text-sm">
            <strong className="text-slate-900">{deleteId && state.students[deleteId]?.name}</strong> silinecek.
        </p>
      </Dialog>
    </div>
  );
};
