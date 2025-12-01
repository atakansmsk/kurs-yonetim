
import React, { useState, useMemo } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student } from '../types';
import { Trash2, Search, UserPlus, MessageSquare, Copy, Send, MessageCircle, Banknote, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog } from '../components/Dialog';

interface StudentListProps {
    onSelect: (id: string) => void;
}

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

  const getPaymentStatus = (student: Student) => {
      // Öğrencinin geçmişinde, BU AY ve BU YIL içinde yapılmış (!isDebt) bir işlem var mı?
      const hasPaidThisMonth = student.history.some(tx => {
          if (tx.isDebt) return false; // Borç kaydı (Ders) ödeme değildir.
          const txDate = new Date(tx.date);
          return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });

      return hasPaidThisMonth ? 'PAID' : 'UNPAID';
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

      // Sıralama: İsim alfabetik
      unpaid.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      paid.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

      return { unpaidStudents: unpaid, paidStudents: paid };
  }, [state.students, search]);

  // İstatistikler
  const totalStudents = Object.keys(state.students).length;
  const unpaidCount = unpaidStudents.length;

  const handleAddStudent = () => {
      if(newName) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0, newRegDate);
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

  const handleSendToStudent = (phone: string) => {
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const separator = isIOS ? '&' : '?';
      const url = `sms:${cleanPhone}${separator}body=${encodeURIComponent(bulkMessage)}`;
      window.open(url, '_self');
  };

  const renderStudentRow = (student: Student, isPaid: boolean) => (
    <div 
        key={student.id} 
        className={`group relative bg-white rounded-xl p-3 shadow-sm border transition-all duration-200 flex items-center gap-3 cursor-pointer active:scale-[0.99] ${isPaid ? 'border-slate-100 hover:border-emerald-200' : 'border-red-50 hover:border-red-200 bg-red-50/10'}`}
        onClick={() => onSelect(student.id)}
    >
        {/* Avatar */}
        <div className="relative">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${isPaid ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-white text-red-600 border-red-100'}`}>
                {student.name.charAt(0).toUpperCase()}
            </div>
            {/* STATUS BADGE */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                isPaid 
                ? 'bg-emerald-500 text-white' 
                : (isCriticalPeriod ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white')
            }`}>
                {isPaid ? <CheckCircle2 size={10} strokeWidth={4} /> : (isCriticalPeriod ? <AlertCircle size={10} strokeWidth={4} /> : <Clock size={10} strokeWidth={4} />)}
            </div>
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 text-sm truncate">{student.name}</h4>
                {/* Ücret bilgisi sağ üstte */}
                <span className={`text-xs font-black ${isPaid ? 'text-emerald-600' : 'text-slate-600'}`}>{student.fee}₺</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
                {!isPaid ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isCriticalPeriod ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isCriticalPeriod ? <AlertCircle size={10}/> : <Clock size={10}/>}
                        {isCriticalPeriod ? 'Ödeme Gecikti (1-5)' : 'Ödeme Bekleniyor'}
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ödendi
                    </span>
                )}
            </div>
        </div>

        <button 
            onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
            <Trash2 size={16} />
        </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] p-4 pb-24">
      
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Öğrenciler</h2>
                <p className="text-xs font-medium text-slate-400">
                    Toplam {totalStudents} öğrenci
                </p>
            </div>
            
            <div className="flex gap-2">
                {/* SMS BUTONU */}
                <button 
                    onClick={() => setIsBulkModalOpen(true)}
                    className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                >
                    <MessageSquare size={18} />
                </button>
                {/* EKLE BUTONU */}
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                    <UserPlus size={18} />
                </button>
            </div>
          </div>
      </div>
      
      {/* Search */}
      <div className="relative mb-4 group sticky top-0 z-10">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
        </div>
        <input 
            type="text" 
            placeholder="İsim ara..." 
            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white/90 backdrop-blur-md text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-4">
        
        {/* --- BÖLÜM 1: ÖDEME BEKLEYENLER (UNPAID) --- */}
        {unpaidStudents.length > 0 && (
            <div className="animate-slide-up">
                <div className="flex items-center justify-between mb-2 px-1 sticky top-0 z-0 bg-[#F8FAFC] py-1">
                    <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={14} />
                        Ödeme Bekleyenler ({unpaidStudents.length})
                    </h3>
                </div>
                <div className="space-y-2">
                    {unpaidStudents.map(s => renderStudentRow(s, false))}
                </div>
            </div>
        )}

        {/* --- BÖLÜM 2: ÖDEMESİ TAMAMLANANLAR (PAID) --- */}
        {paidStudents.length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-between mb-2 px-1 sticky top-0 z-0 bg-[#F8FAFC] py-1">
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        Ödemesi Tamamlananlar ({paidStudents.length})
                    </h3>
                </div>
                <div className="space-y-2">
                    {paidStudents.map(s => renderStudentRow(s, true))}
                </div>
            </div>
        )}

        {unpaidStudents.length === 0 && paidStudents.length === 0 && (
             <div className="flex flex-col items-center justify-center mt-10 text-slate-300 opacity-60 animate-slide-up">
                <Search size={32} className="mb-2" />
                <p className="font-bold text-sm">Kayıt bulunamadı.</p>
             </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Öğrenci" 
        actions={
            <>
                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
                <button onClick={handleAddStudent} disabled={!newName} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 active:scale-95 transition-all">Kaydet</button>
            </>
        }
      >
          <div className="flex flex-col gap-3 py-1">
             <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Ad Soyad" autoFocus />
             <input type="tel" value={newPhone} onChange={e=>setNewPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Telefon" />
             
             <div className="flex gap-2">
                <input type="number" value={newFee} onChange={e=>setNewFee(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Aylık Ücret" />
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
                    Sadece Ödemeyenler
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
