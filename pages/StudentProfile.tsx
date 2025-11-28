
import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { Phone, Check, Banknote, ArrowLeft, Trash2, Clock, MessageCircle, Pencil, Wallet, CalendarDays, Calendar, RefreshCcw, MoreHorizontal, History, Layers, CheckCircle2, ChevronLeft, ChevronRight, Share2, Eye } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { Transaction } from '../types';

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onBack }) => {
  const { state, actions } = useCourse();
  const { user } = useAuth();
  const student = state.students[studentId];
  const [activeTab, setActiveTab] = useState<'STATUS' | 'HISTORY'>('STATUS');
  
  // Modals
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [isPastLessonModalOpen, setIsPastLessonModalOpen] = useState(false);
  const [isPastPaymentModalOpen, setIsPastPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLessonOptionsOpen, setIsLessonOptionsOpen] = useState(false);
  const [isMakeupCompleteModalOpen, setIsMakeupCompleteModalOpen] = useState(false);
  
  // Selection
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Form Data
  const [pastDate, setPastDate] = useState("");
  const [pastPaymentDate, setPastPaymentDate] = useState("");
  const [pastPaymentAmount, setPastPaymentAmount] = useState("");
  const [makeupCompleteDate, setMakeupCompleteDate] = useState("");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFee, setEditFee] = useState("");

  if (!student) return null;

  // Helpers for Dates
  const getTodayString = () => new Date().toISOString().split('T')[0];
  
  const formatDateFriendly = (dateStr: string) => {
      if (!dateStr) return "";
      return new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getPhoneClean = () => {
      let phone = student.phone.replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) phone = phone.substring(1);
      if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone;
      return phone;
  }

  // --- Date Shifter Helper (-1 / +1 Days) ---
  const shiftDate = (dateStr: string, days: number) => {
      const baseDate = dateStr ? new Date(dateStr) : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      
      const result = baseDate.toISOString().split('T')[0];
      const today = getTodayString();
      
      // Gelecek tarihe geçmeyi engelle
      return result > today ? today : result;
  };
  
  const handleWhatsapp = () => {
      const phone = getPhoneClean();
      // WhatsApp Business link formatı (Universal Link)
      const message = `Merhaba ${student.name},`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleCall = () => window.open(`tel:+${getPhoneClean()}`, '_self');
  const handleDeleteTx = () => { if(deleteTxId) { actions.deleteTransaction(studentId, deleteTxId); setDeleteTxId(null); } }
  
  const handleAddPastLesson = () => {
      if (pastDate) {
          actions.addTransaction(studentId, 'LESSON', pastDate);
          setIsPastLessonModalOpen(false);
          setPastDate("");
      }
  };

  const handleAddPastPayment = () => {
      if (pastPaymentDate && pastPaymentAmount) {
          actions.addTransaction(studentId, 'PAYMENT', pastPaymentDate, parseFloat(pastPaymentAmount));
          setIsPastPaymentModalOpen(false);
          setPastPaymentDate("");
          setPastPaymentAmount("");
      }
  };

  const handleUpdateStudent = () => {
      if (editName) {
          actions.updateStudent(studentId, editName, editPhone, parseFloat(editFee) || 0);
          setIsEditModalOpen(false);
      }
  };

  const handleLessonAction = (action: 'ABSENT' | 'MAKEUP' | 'DELETE' | 'MAKEUP_DONE') => {
      if (!selectedTx) return;

      if (action === 'DELETE') {
          actions.deleteTransaction(studentId, selectedTx.id);
      } else if (action === 'ABSENT') {
          actions.updateTransaction(studentId, selectedTx.id, "Gelmedi (Habersiz)");
      } else if (action === 'MAKEUP') {
          actions.updateTransaction(studentId, selectedTx.id, "Telafi Bekliyor");
      } else if (action === 'MAKEUP_DONE') {
          setIsLessonOptionsOpen(false);
          setIsMakeupCompleteModalOpen(true);
          // Don't clear selectedTx yet
          return; 
      }
      setIsLessonOptionsOpen(false);
      setSelectedTx(null);
  };

  const handleMakeupComplete = () => {
      if (!selectedTx || !makeupCompleteDate) return;
      
      const dateObj = new Date(makeupCompleteDate);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      
      // Notu güncelle: "Telafi Edildi (29 Kasım)"
      const newNote = `Telafi Edildi (${dateStr})`;
      
      // Bu işlem Context tarafında "Telafi Bekliyor" notunu değiştirdiği için
      // otomatik olarak telafi kredisini 1 düşürecektir.
      actions.updateTransaction(studentId, selectedTx.id, newNote);
      
      setIsMakeupCompleteModalOpen(false);
      setMakeupCompleteDate("");
      setSelectedTx(null);
  };

  const handleOpenParentPortal = () => {
      // Veli Portalı Linki Oluştur
      const baseUrl = window.location.origin + window.location.pathname;
      const portalUrl = `${baseUrl}?parentView=true&teacherId=${user?.id}&studentId=${student.id}`;
      window.open(portalUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] animate-slide-up">
      
      {/* 1. Compact Header */}
      <div className="bg-white px-5 pt-4 pb-2 z-20 sticky top-0">
        <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                <ArrowLeft size={24} strokeWidth={2} />
            </button>
            
            <div className="flex gap-2">
                 <button onClick={handleCall} className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors" title="Ara">
                    <Phone size={18} />
                </button>
                <button onClick={handleWhatsapp} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp Mesaj Gönder">
                    <MessageCircle size={18} />
                </button>
                <button 
                    onClick={() => {
                        setEditName(student.name);
                        setEditPhone(student.phone);
                        setEditFee(student.fee.toString());
                        setIsEditModalOpen(true);
                    }}
                    className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="Düzenle"
                >
                    <Pencil size={18} />
                </button>
            </div>
        </div>

        <div className="flex items-center gap-4 mb-2">
             <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-slate-200">
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{student.name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        Aylık {student.fee} ₺
                    </span>
                    {(student.makeupCredit || 0) > 0 && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 flex items-center gap-1">
                            <Layers size={10} />
                            {student.makeupCredit} Telafi Hakkı
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-100 mt-4">
              <button onClick={() => setActiveTab('STATUS')} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'STATUS' ? 'text-slate-800' : 'text-slate-400'}`}>
                  Abonelik Durumu
                  {activeTab === 'STATUS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-t-full"></div>}
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'HISTORY' ? 'text-slate-800' : 'text-slate-400'}`}>
                  Tüm Geçmiş
                  {activeTab === 'HISTORY' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-t-full"></div>}
              </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 bg-[#F8FAFC]">
        {activeTab === 'STATUS' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* 2. Lesson Count Focused Card (Subscription Model) */}
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-300">
                     {/* Background Decor */}
                     <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                     <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>

                     <div className="relative z-10 flex justify-between items-end mb-6">
                        <div>
                            <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">BU AY YAPILAN</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-6xl font-black tracking-tighter">
                                    {student.debtLessonCount}
                                </h2>
                                <span className="text-xl font-bold text-slate-500 tracking-normal">Ders</span>
                            </div>
                            
                            {(student.makeupCredit || 0) > 0 && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-200">
                                    <Layers size={12} />
                                    <span className="text-[10px] font-bold">+{student.makeupCredit} Telafi Bekliyor</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">AYLIK ÜCRET</p>
                            <div className="text-lg font-bold text-white tabular-nums">{student.fee} ₺</div>
                        </div>
                     </div>

                     <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-slate-400 bg-black/20 p-3 rounded-xl">
                         <RefreshCcw size={14} className="text-emerald-400" />
                         <span>Aylık abonelik sistemi aktiftir. <span className="text-white font-bold">Haftada 1</span> ders planlanır.</span>
                     </div>
                </div>

                {/* 3. Actions */}
                <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => { if (student.debtLessonCount > 0) actions.addTransaction(student.id, 'PAYMENT'); }} 
                        disabled={student.debtLessonCount === 0}
                        className="col-span-2 bg-emerald-500 text-white rounded-2xl p-4 shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-between disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed group"
                     >
                         <div className="flex flex-col items-start">
                             <span className="font-black text-lg">Aylık Ödeme Al</span>
                             <span className="text-xs text-emerald-100 font-bold opacity-90">Sayacı sıfırla & ayı kapat</span>
                         </div>
                         <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                             <Check size={24} />
                         </div>
                     </button>

                     <button 
                        onClick={() => { setPastDate(getTodayString()); setIsPastLessonModalOpen(true); }}
                        className="bg-white border border-slate-200 text-slate-500 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 active:scale-95 transition-all shadow-sm"
                     >
                         <CalendarDays size={20} />
                         <span className="text-[10px] font-bold">Geçmiş Ders</span>
                     </button>

                     <button 
                        onClick={() => { setPastPaymentDate(getTodayString()); setPastPaymentAmount(student.fee.toString()); setIsPastPaymentModalOpen(true); }}
                        className="bg-white border border-slate-200 text-slate-500 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 active:scale-95 transition-all shadow-sm"
                     >
                         <History size={20} />
                         <span className="text-[10px] font-bold">Geçmiş Ödeme</span>
                     </button>

                     {/* Veli Portalı Butonu */}
                     <button 
                        onClick={handleOpenParentPortal}
                        className="col-span-2 bg-slate-800 text-white rounded-2xl p-3 shadow-lg shadow-slate-300 flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-[0.98] transition-all"
                     >
                         <Eye size={18} className="text-slate-300" />
                         <span className="font-bold text-sm">Veli Portalını Görüntüle (Örnek)</span>
                     </button>
                </div>

                {/* 4. Lesson History List */}
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 ml-1 flex items-center justify-between">
                        <span>BU DÖNEMKİ DERSLER</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Yoklama</span>
                    </h3>
                    
                    {student.debtLessonCount === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                             <Calendar size={32} className="mb-2 opacity-50" />
                             <p className="text-xs font-bold">Bu dönem henüz ders işlenmedi.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 py-2">
                            {student.history
                                .filter(tx => tx.isDebt) 
                                .slice(0, student.debtLessonCount + (student.makeupCredit || 0)) // Gösterilen liste sayısı
                                .map((tx, i, arr) => {
                                    const lessonNum = arr.length - i;
                                    const dateObj = new Date(tx.date);
                                    const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric' });
                                    const month = dateObj.toLocaleDateString('tr-TR', { month: 'long' });
                                    
                                    const isAbsent = tx.note.includes("Habersiz");
                                    const isMakeupWait = tx.note.includes("Telafi Bekliyor");
                                    const isMakeupDone = tx.note.includes("Telafi Edildi");
                                    
                                    return (
                                        <div key={tx.id} className="relative pl-6 group">
                                            {/* Timeline Dot */}
                                            <div className={`absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${isAbsent ? 'bg-red-500' : isMakeupWait ? 'bg-orange-400' : isMakeupDone ? 'bg-emerald-400' : 'bg-indigo-500'}`}></div>
                                            
                                            <div 
                                                onClick={() => { setSelectedTx(tx); setIsLessonOptionsOpen(true); }}
                                                className={`p-3 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer ${
                                                    isAbsent ? 'bg-red-50 border-red-100' :
                                                    isMakeupWait ? 'bg-orange-50 border-orange-100' :
                                                    isMakeupDone ? 'bg-emerald-50 border-emerald-100' :
                                                    'bg-white border-slate-100 hover:border-indigo-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border text-slate-700 ${isAbsent ? 'bg-white border-red-100' : isMakeupWait ? 'bg-white border-orange-100' : isMakeupDone ? 'bg-white border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                                        <span className="text-lg font-black leading-none">{day}</span>
                                                        <span className="text-[8px] font-bold uppercase">{month.slice(0,3)}</span>
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold text-sm flex items-center gap-2 ${isAbsent ? 'text-red-700' : isMakeupWait ? 'text-orange-700' : isMakeupDone ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                            {isAbsent ? 'Habersiz Gelmedi' : isMakeupWait ? 'Telafi Bekliyor' : isMakeupDone ? 'Telafi Edildi' : `${lessonNum}. Ders İşlendi`}
                                                            {tx.note.includes("Otomatik") && !isAbsent && !isMakeupWait && !isMakeupDone && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">OTO</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {isMakeupDone ? tx.note.split('(')[1]?.replace(')', '') || 'Tamamlandı' : `${new Date(tx.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}`} - Düzenle
                                                        </div>
                                                    </div>
                                                </div>
                                                <MoreHorizontal size={16} className="text-slate-300" />
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    )}
                </div>
            </div>
        ) : (
            /* History Tab (Payments mostly) */
            <div className="space-y-3 animate-in fade-in duration-300">
                {student.history.length === 0 ? (
                     <div className="flex flex-col items-center justify-center mt-10 text-slate-300 opacity-50"><Clock size={48} className="mb-4" /><p className="font-bold">İşlem yok.</p></div>
                ) : (
                    student.history.map((tx, idx) => (
                        <div key={tx.id} className={`p-4 rounded-2xl shadow-sm border flex justify-between items-center group ${tx.isDebt ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-emerald-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.isDebt ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    {tx.isDebt ? <Check size={18} strokeWidth={3} /> : <Banknote size={18} strokeWidth={2.5} />}
                                </div>
                                <div>
                                    <div className={`font-bold text-sm ${tx.isDebt ? 'text-slate-600' : 'text-emerald-600'}`}>{tx.note}</div>
                                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(tx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!tx.isDebt && <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{tx.amount} ₺</span>}
                                <button onClick={() => setDeleteTxId(tx.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
      </div>
      
      {/* Dialogs */}
      <Dialog isOpen={!!deleteTxId} onClose={() => setDeleteTxId(null)} title="İşlemi Sil" actions={
            <>
             <button onClick={() => setDeleteTxId(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm">Vazgeç</button>
             <button onClick={handleDeleteTx} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 text-sm">Sil</button>
            </>
        }
      >
        <p className="text-slate-600 text-sm font-medium">Bu kayıt kalıcı olarak silinecek.</p>
      </Dialog>

      {/* Geçmiş Ders Modal */}
      <Dialog isOpen={isPastLessonModalOpen} onClose={() => setIsPastLessonModalOpen(false)} title="Geçmiş Ders Ekle"
        actions={
            <>
                 <button onClick={() => setIsPastLessonModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
                 <button onClick={handleAddPastLesson} disabled={!pastDate} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 disabled:opacity-50 active:scale-95 transition-all">Ekle</button>
            </>
        }
      >
         <div className="py-2 flex flex-col gap-3">
             <div className="flex justify-between items-center mb-1">
                 <p className="text-xs text-slate-500">Tarih Seçin</p>
                 <div className="flex gap-2">
                     <button onClick={() => setPastDate(shiftDate(pastDate, -7))} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-colors">-1 Hafta</button>
                     <button onClick={() => setPastDate(getTodayString())} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-colors">Bugün</button>
                 </div>
             </div>
             
             {/* Date Shifter Input */}
             <div className="flex items-center gap-2">
                 <button onClick={() => setPastDate(shiftDate(pastDate, -1))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"><ChevronLeft size={20} /></button>
                 <input type="date" max={getTodayString()} value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 text-center" />
                 <button onClick={() => setPastDate(shiftDate(pastDate, 1))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"><ChevronRight size={20} /></button>
             </div>

             {pastDate && <p className="text-[10px] text-indigo-600 font-bold ml-1 text-center bg-indigo-50 py-1 rounded-lg">{formatDateFriendly(pastDate)}</p>}
         </div>
      </Dialog>
      
      {/* Geçmiş Ödeme Modal */}
      <Dialog isOpen={isPastPaymentModalOpen} onClose={() => setIsPastPaymentModalOpen(false)} title="Geçmiş Ödeme"
        actions={
            <>
                 <button onClick={() => setIsPastPaymentModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
                 <button onClick={handleAddPastPayment} disabled={!pastPaymentDate || !pastPaymentAmount} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 disabled:opacity-50 active:scale-95 transition-all">Kaydet</button>
            </>
        }
      >
         <div className="py-2 flex flex-col gap-3">
             <div>
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-slate-500">Ödeme Tarihi</p>
                    <div className="flex gap-2">
                        <button onClick={() => setPastPaymentDate(shiftDate(pastPaymentDate, -7))} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-colors">-1 Hafta</button>
                        <button onClick={() => setPastPaymentDate(getTodayString())} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-colors">Bugün</button>
                    </div>
                </div>

                {/* Date Shifter Input */}
                <div className="flex items-center gap-2">
                    <button onClick={() => setPastPaymentDate(shiftDate(pastPaymentDate, -1))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"><ChevronLeft size={20} /></button>
                    <input type="date" max={getTodayString()} value={pastPaymentDate} onChange={(e) => setPastPaymentDate(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500 text-center" />
                    <button onClick={() => setPastPaymentDate(shiftDate(pastPaymentDate, 1))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"><ChevronRight size={20} /></button>
                </div>
                {pastPaymentDate && <p className="text-[10px] text-emerald-600 font-bold ml-1 mt-1 text-center bg-emerald-50 py-1 rounded-lg">{formatDateFriendly(pastPaymentDate)}</p>}
             </div>
             <div>
                <p className="text-xs text-slate-500 mb-1">Tutar (TL)</p>
                <input type="number" value={pastPaymentAmount} onChange={(e) => setPastPaymentAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500" />
             </div>
         </div>
      </Dialog>

      {/* Telafi Tamamlama Modal (Tarih Seçimi) */}
      <Dialog isOpen={isMakeupCompleteModalOpen} onClose={() => setIsMakeupCompleteModalOpen(false)} title="Telafi Yapıldı"
         actions={
             <>
                <button onClick={() => setIsMakeupCompleteModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
                <button onClick={handleMakeupComplete} disabled={!makeupCompleteDate} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 disabled:opacity-50 active:scale-95 transition-all">Kaydet</button>
             </>
         }
      >
         <div className="py-2 flex flex-col gap-3">
             <div className="flex justify-between items-center mb-1">
                 <p className="text-sm text-slate-600 font-medium">Hangi tarihte yapıldı?</p>
                 <div className="flex gap-2">
                     <button onClick={() => setMakeupCompleteDate(shiftDate(makeupCompleteDate, -7))} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-colors">-1 Hafta</button>
                     <button onClick={() => setMakeupCompleteDate(getTodayString())} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-colors">Bugün</button>
                 </div>
             </div>
             
             {/* Date Shifter Input */}
             <div className="flex items-center gap-2">
                 <button onClick={() => setMakeupCompleteDate(shiftDate(makeupCompleteDate, -1))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"><ChevronLeft size={20} /></button>
                 <input type="date" max={getTodayString()} value={makeupCompleteDate} onChange={(e) => setMakeupCompleteDate(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500 text-center" />
                 <button onClick={() => setMakeupCompleteDate(shiftDate(makeupCompleteDate, 1))} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"><ChevronRight size={20} /></button>
             </div>

             {makeupCompleteDate && <p className="text-[10px] text-emerald-600 font-bold ml-1 text-center bg-emerald-50 py-1 rounded-lg">{formatDateFriendly(makeupCompleteDate)}</p>}
             
             <p className="text-[10px] text-slate-400 ml-1 mt-1">Kumbara: <span className="text-slate-600 font-bold">-1 Telafi Hakkı</span> düşülecek.</p>
         </div>
      </Dialog>

      {/* Ders Durum Opsiyonları Modal */}
      <Dialog isOpen={isLessonOptionsOpen} onClose={() => setIsLessonOptionsOpen(false)} title="Ders Durumu">
         <div className="flex flex-col gap-2 py-2">
            
            {/* Özel Durum: Eğer seçili işlem "Telafi Bekliyor" ise, "Telafi Yapıldı" butonunu göster */}
            {selectedTx?.note === "Telafi Bekliyor" && (
                <button onClick={() => handleLessonAction('MAKEUP_DONE')} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800 hover:bg-emerald-100 transition-colors mb-2 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm"><CheckCircle2 size={16} /></div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Telafisi Yapıldı</div>
                        <div className="text-[10px] text-emerald-600 opacity-80">Tarih girerek tamamlandı işaretle.</div>
                    </div>
                </button>
            )}

            <button onClick={() => handleLessonAction('DELETE')} className="w-full p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={18} />
                <div className="text-left">
                    <div className="font-bold text-sm">Dersi İptal Et (Sil)</div>
                    <div className="text-left text-[10px] opacity-70">Yanlışlıkla işlendiyse silin.</div>
                </div>
            </button>
            
            <button onClick={() => handleLessonAction('ABSENT')} className="w-full p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-slate-800 hover:bg-red-50 transition-colors">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">!</div>
                <div className="text-left">
                    <div className="font-bold text-sm">Habersiz Gelmedi</div>
                    <div className="text-[10px] text-slate-500">Ücret iadesi/telafi yapılmaz.</div>
                </div>
            </button>

            <button onClick={() => handleLessonAction('MAKEUP')} className="w-full p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-slate-800 hover:bg-orange-50 transition-colors">
                 <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">T</div>
                <div className="text-left">
                    <div className="font-bold text-sm">Telafi Yapılacak</div>
                    <div className="text-[10px] text-slate-500">Kumbara: <span className="text-orange-600 font-bold">+1 Telafi Hakkı</span> eklenir.</div>
                </div>
            </button>
         </div>
      </Dialog>

      <Dialog isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Bilgileri Düzenle"
        actions={
            <>
                 <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl">İptal</button>
                 <button onClick={handleUpdateStudent} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md shadow-slate-300 active:scale-95 transition-all">Güncelle</button>
            </>
        }
      >
          <div className="flex flex-col gap-3 py-1">
             <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-slate-900" placeholder="Ad Soyad" />
             <input type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-slate-900" placeholder="Telefon" />
             <div>
                 <input type="number" value={editFee} onChange={e=>setEditFee(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:border-slate-900" placeholder="Aylık Ücret" />
                 <p className="text-[10px] text-slate-400 mt-1 ml-1">* Sabit aylık abonelik ücreti.</p>
             </div>
          </div>
      </Dialog>
    </div>
  );
};
