
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { Phone, Check, Banknote, ArrowLeft, Trash2, MessageCircle, Pencil, Wallet, RefreshCcw, CheckCircle2, Share2, Link, Youtube, FileText, Image, Plus, UploadCloud, X, Loader2, Globe, BellRing, XCircle, Layers, Archive, Activity } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { Transaction } from '../types';
import { StorageService } from '../services/api';

interface StudentProfileProps {
  studentId: string;
  onBack: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onBack }) => {
  const { state, actions } = useCourse();
  const { user } = useAuth();
  const student = state.students[studentId];
  
  // Modals
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [isPastLessonModalOpen, setIsPastLessonModalOpen] = useState(false);
  const [isPastPaymentModalOpen, setIsPastPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLessonOptionsOpen, setIsLessonOptionsOpen] = useState(false);
  const [isMakeupCompleteModalOpen, setIsMakeupCompleteModalOpen] = useState(false);
  const [isResourcesModalOpen, setIsResourcesModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  
  // Selection
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Form Data
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [pastDate, setPastDate] = useState(getTodayString());
  const [pastPaymentDate, setPastPaymentDate] = useState(getTodayString());
  const [pastPaymentAmount, setPastPaymentAmount] = useState("");
  const [makeupCompleteDate, setMakeupCompleteDate] = useState(getTodayString());

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFee, setEditFee] = useState("");

  // Resource Form
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resType, setResType] = useState<'VIDEO' | 'PDF' | 'LINK' | 'IMAGE'>('LINK');
  const [resTab, setResTab] = useState<'LINK' | 'UPLOAD'>('LINK');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-fill payment amount when modal opens
  useEffect(() => {
      if (isPastPaymentModalOpen && student) {
          setPastPaymentAmount(student.fee.toString());
      }
  }, [isPastPaymentModalOpen, student]);

  // --- SORTER ---
  // Tarihe göre her zaman yeniden sırala (En yeni en üstte)
  const sortedHistory = useMemo(() => {
      if (!student) return [];
      return [...student.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student]);

  // --- HISTORY SPLITTER (CURRENT vs ARCHIVE) ---
  const { currentHistory, archivedHistory, debtCount } = useMemo(() => {
      if (!student) return { currentHistory: [], archivedHistory: [], debtCount: 0 };
      
      // Son ödemeyi bul (Telafi veya Ders olmayan, borç düşmeyen işlem)
      // Ödeme işlemi: isDebt = false
      const lastPaymentIndex = sortedHistory.findIndex(tx => !tx.isDebt);
      
      let current: Transaction[] = [];
      let archived: Transaction[] = [];

      if (lastPaymentIndex !== -1) {
          // Ödemeden önceki (tarih olarak sonraki) tüm işlemler = GÜNCEL LİSTE
          current = sortedHistory.slice(0, lastPaymentIndex);
          // Ödeme ve sonrası = ARŞİV
          archived = sortedHistory.slice(lastPaymentIndex);
      } else {
          // Hiç ödeme yoksa hepsi güncel
          current = sortedHistory;
      }

      // Borç sayacı: Sadece "Normal Ders" ve "İşlendi" olanlar.
      const debtLessons = current.filter(tx => 
          tx.isDebt && 
          !tx.note.toLowerCase().includes("telafi") && 
          !tx.note.toLowerCase().includes("deneme") &&
          !tx.note.toLowerCase().includes("gelmedi")
      );

      return { currentHistory: current, archivedHistory: archived, debtCount: debtLessons.length };
  }, [sortedHistory]);
  
  // Lesson Number Map Calculation (For display 1. Ders, 2. Ders)
  const lessonNumberMap = useMemo(() => {
      if (!student) return new Map();
      const map = new Map<string, number>();
      
      // Sadece borç sayılan dersleri numaralandır (arşiv dahil tüm tarihçe için)
      const allRegularLessons = sortedHistory.filter(tx => 
        tx.isDebt && 
        !tx.note.toLowerCase().includes("telafi") && 
        !tx.note.toLowerCase().includes("deneme") && 
        !tx.note.toLowerCase().includes("iptal") && 
        !tx.note.toLowerCase().includes("gelmedi")
      );
      
      // Eskiden yeniye sırala
      const ascLessons = [...allRegularLessons].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      ascLessons.forEach((tx, index) => {
          map.set(tx.id, index + 1);
      });
      return map;
  }, [sortedHistory]);

  if (!student) return null;
  
  const getPhoneClean = () => {
      let phone = student.phone.replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) phone = phone.substring(1);
      if (!phone.startsWith('90') && phone.length === 10) phone = '90' + phone;
      return phone;
  }
  
  const handleWhatsapp = () => {
      const phone = getPhoneClean();
      const message = `Merhaba ${student.name},`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handlePaymentReminder = () => {
      const phone = getPhoneClean();
      const currentMonth = new Date().toLocaleDateString('tr-TR', { month: 'long' });
      const message = `Merhaba ${student.name}, ${currentMonth} ayı için ödeme hatırlatması yapmak istedim. Müsait olduğunuzda yardımcı olabilirseniz sevinirim. Teşekkürler! 🌸`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleShareResource = (title: string, resourceUrl: string) => {
      const phone = getPhoneClean();
      const message = `Merhaba ${student.name}, senin için yeni bir materyal ekledim. Buradan ulaşabilirsin:\n\n*${title}*\n${resourceUrl}`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleCall = () => window.open(`tel:+${getPhoneClean()}`, '_self');
  
  const handleAddPastLesson = () => {
      if (pastDate) {
          actions.addTransaction(studentId, 'LESSON', pastDate);
          setIsPastLessonModalOpen(false);
          setPastDate(getTodayString());
      }
  };

  const handleAddPastPayment = () => {
      if (pastPaymentDate && pastPaymentAmount !== "") {
          actions.addTransaction(studentId, 'PAYMENT', pastPaymentDate, parseFloat(pastPaymentAmount));
          setIsPastPaymentModalOpen(false);
          setPastPaymentDate(getTodayString());
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
          return; 
      }
      setIsLessonOptionsOpen(false);
      setSelectedTx(null);
  };

  const handleMakeupComplete = () => {
      if (!selectedTx || !makeupCompleteDate) return;
      const dateObj = new Date(makeupCompleteDate);
      const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
      const newNote = `Telafi Edildi (${dateStr})`;
      actions.updateTransaction(studentId, selectedTx.id, newNote);
      setIsMakeupCompleteModalOpen(false);
      setMakeupCompleteDate(getTodayString());
      setSelectedTx(null);
  };

  const handleOpenParentPortal = () => {
      const baseUrl = window.location.origin + window.location.pathname;
      const portalUrl = `${baseUrl}?parentView=true&teacherId=${user?.id}&studentId=${student.id}`;
      window.open(portalUrl, '_blank');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !user) return;
      setIsUploading(true);
      try {
          const timestamp = new Date().getTime();
          let blobToUpload: Blob = file;
          let fileType: 'IMAGE' | 'PDF' = 'PDF';
          if (file.type.startsWith('image/')) {
               fileType = 'IMAGE';
               blobToUpload = await new Promise((resolve, reject) => {
                  const img = document.createElement('img');
                  const objectUrl = URL.createObjectURL(file);
                  img.src = objectUrl;
                  img.onload = () => {
                      URL.revokeObjectURL(objectUrl);
                      const canvas = document.createElement('canvas');
                      let width = img.width; let height = img.height; const MAX_WIDTH = 1024;
                      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                      canvas.width = width; canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Canvas failed')); }, 'image/jpeg', 0.8);
                  };
                  img.onerror = reject;
              });
          } else if (file.type === 'application/pdf') { fileType = 'PDF'; blobToUpload = file; }
          const extension = fileType === 'IMAGE' ? 'jpg' : 'pdf';
          const path = `resources/${user.id}/${studentId}/${timestamp}.${extension}`;
          const downloadUrl = await StorageService.uploadFile(blobToUpload, path);
          setResUrl(downloadUrl); setResType(fileType);
          if (!resTitle) setResTitle(`${fileType === 'IMAGE' ? 'Görsel' : 'Dosya'} ${new Date().toLocaleDateString('tr-TR')}`);
      } catch (error) { console.error("Yükleme hatası:", error); alert("Dosya yüklenemedi."); } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleAddResource = () => {
      if(resTitle && resUrl) {
          let finalType = resType; let finalUrl = resUrl;
          if (resTab === 'LINK') {
              finalType = 'LINK';
              if (finalUrl.includes('youtube.com') || finalUrl.includes('youtu.be')) finalType = 'VIDEO';
              if (finalUrl.endsWith('.pdf')) finalType = 'PDF';
              if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = `https://${finalUrl}`;
          }
          actions.addResource(studentId, resTitle, finalUrl, finalType);
          setResTitle(""); setResUrl(""); setResType('LINK');
      }
  };

  // Helper to render a transaction item
  const renderTransactionItem = (tx: Transaction) => {
      const isPayment = !tx.isDebt;
      const dateObj = new Date(tx.date);
      const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric' });
      const month = dateObj.toLocaleDateString('tr-TR', { month: 'short' });
      
      // Smart Title Logic
      let title = tx.note;
      let sub = isPayment ? "Ödeme" : "Tamamlandı";
      let icon = <Check size={16} />;
      let iconClass = "bg-indigo-50 text-indigo-600";
      let showAmount = isPayment;
      
      if (isPayment) {
          title = "Ödeme Alındı";
          icon = <Banknote size={16} />;
          iconClass = "bg-emerald-50 text-emerald-600";
      } else if (tx.note.includes('Telafi')) {
          icon = <RefreshCcw size={16} />;
          iconClass = "bg-orange-50 text-orange-600";
          if (tx.note.includes('Bekliyor')) {
              title = "Telafi Hakkı";
              sub = "Planlanacaktır";
          } else {
              title = "Telafi Dersi";
              sub = "Yapıldı";
          }
      } else if (tx.note.includes('Gelmedi')) {
           title = "Katılım Yok";
           sub = "Habersiz";
           icon = <XCircle size={16} />;
           iconClass = "bg-red-50 text-red-600";
      } else {
          // Numbered Lesson
          const num = lessonNumberMap.get(tx.id);
          if (num) title = `${num}. Ders`;
      }

      return (
          <div key={tx.id} className="flex gap-3 animate-slide-up">
              <div className="flex flex-col items-center justify-center w-[42px] shrink-0 bg-white py-1 rounded-lg border border-slate-50 shadow-sm z-10 h-10 self-start mt-0.5">
                  <span className="text-sm font-black text-slate-700 leading-none">{day}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">{month}</span>
              </div>
              
              <div onClick={() => { setSelectedTx(tx); setIsLessonOptionsOpen(true); }} className="flex-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-colors active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                          {icon}
                      </div>
                      <div>
                          <h4 className="text-sm font-bold text-slate-800 leading-none mb-1">{title}</h4>
                          <p className="text-[10px] font-medium text-slate-400 leading-none">{sub}</p>
                      </div>
                  </div>
                  {showAmount && (
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">+{tx.amount}₺</span>
                  )}
              </div>
          </div>
      );
  };

  const displayedLessonCount = debtCount;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] animate-slide-up">
      
      {/* 1. Header */}
      <div className="bg-white px-5 pt-4 pb-4 z-20 sticky top-0 border-b border-slate-50">
        <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                <ArrowLeft size={24} strokeWidth={2} />
            </button>
            
            <div className="flex gap-2">
                 <button onClick={handleCall} className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors" title="Ara">
                    <Phone size={18} />
                </button>
                <button onClick={handlePaymentReminder} className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-colors" title="Ödeme Hatırlat (WhatsApp)">
                    <BellRing size={18} />
                </button>
                <button onClick={handleWhatsapp} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp Mesaj Gönder">
                    <MessageCircle size={18} />
                </button>
                <button 
                    onClick={() => { setEditName(student.name); setEditPhone(student.phone); setEditFee(student.fee.toString()); setIsEditModalOpen(true); }}
                    className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="Düzenle"
                >
                    <Pencil size={18} />
                </button>
            </div>
        </div>

        <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-slate-200">
                {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">{student.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                     <button onClick={handleOpenParentPortal} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors">
                        <Globe size={10} /> Veli Bilgilendirme Linki
                     </button>
                </div>
            </div>
        </div>
      </div>

      {/* 2. Content Scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10 space-y-6">
          
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 gap-3">
              {/* Ders Sayacı */}
              <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-1.5 opacity-80 mb-3">
                          <Layers size={14} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Ders Sayacı</span>
                      </div>
                      <div className="text-3xl font-black">{displayedLessonCount}</div>
                      <div className="text-[10px] opacity-80 font-medium mt-1">Son ödemeden beri</div>
                  </div>
              </div>

              {/* Aylık Abonelik Ücreti (Fixed Display) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                   <div>
                      <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                          <Wallet size={14} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Aylık Ücret</span>
                      </div>
                      <div className="text-xl font-black text-slate-800">
                         {student.fee.toLocaleString('tr-TR')} ₺
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">Sabit Abonelik</div>
                   </div>
                   
                   {displayedLessonCount > 0 ? (
                       <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg self-start flex items-center gap-1 mt-1">
                           <Activity size={10} /> {displayedLessonCount} Ders Birikti
                       </div>
                   ) : (
                       <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg self-start flex items-center gap-1 mt-1">
                           <CheckCircle2 size={10} /> Yeni Dönem
                       </div>
                   )}
              </div>
          </div>

          {/* RESOURCES SECTION */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Link size={14} /> Materyaller
                  </h3>
                  <button onClick={() => setIsResourcesModalOpen(true)} className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors">
                      <Plus size={14} />
                  </button>
              </div>

              {student.resources.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl opacity-50">
                      <p className="text-[10px] font-bold">Dosya veya Link Eklenmedi</p>
                  </div>
              ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                      {student.resources.map(res => (
                          <div key={res.id} className="min-w-[140px] bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm relative group">
                              <div className="flex items-center gap-2 mb-2">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                      res.type === 'VIDEO' ? 'bg-red-50 text-red-500' : 
                                      res.type === 'PDF' ? 'bg-blue-50 text-blue-500' : 
                                      'bg-emerald-50 text-emerald-500'
                                   }`}>
                                      {res.type === 'VIDEO' ? <Youtube size={16} /> : res.type === 'PDF' ? <FileText size={16} /> : <Image size={16} />}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="text-[10px] font-bold truncate">{res.title}</div>
                                      <div className="text-[9px] text-slate-400 truncate">{new Date(res.date).toLocaleDateString()}</div>
                                   </div>
                              </div>
                              <div className="flex gap-1">
                                  <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[10px] font-bold bg-slate-50 py-1 rounded hover:bg-slate-100">Aç</a>
                                  <button onClick={() => handleShareResource(res.title, res.url)} className="w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"><Share2 size={12} /></button>
                                  <button onClick={() => actions.deleteResource(studentId, res.id)} className="w-6 flex items-center justify-center bg-red-50 text-red-500 rounded hover:bg-red-100"><X size={12} /></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* HISTORY & ACTIONS */}
          <div>
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <RefreshCcw size={14} /> Güncel Hareketler
                  </h3>
               </div>
               
               {/* Action Buttons */}
               <div className="grid grid-cols-2 gap-3 mb-6">
                    <button onClick={() => setIsPastLessonModalOpen(true)} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                        <Check size={16} className="text-indigo-500" /> Geçmiş Ders Ekle
                    </button>
                    <button onClick={() => setIsPastPaymentModalOpen(true)} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                        <Banknote size={16} className="text-emerald-500" /> Ödeme Ekle
                    </button>
               </div>

               {/* TIMELINE LIST - ONLY CURRENT PERIOD */}
               <div className="relative space-y-4 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 before:-z-10 pb-6">
                  {currentHistory.length === 0 ? (
                      <div className="text-center py-10 opacity-50">
                          <p className="text-sm font-bold text-slate-400">Yeni dönem için kayıt yok.</p>
                      </div>
                  ) : (
                      currentHistory.map(renderTransactionItem)
                  )}
               </div>

               {/* ARCHIVE BUTTON */}
               {archivedHistory.length > 0 && (
                   <button 
                    onClick={() => setIsArchiveModalOpen(true)}
                    className="w-full py-3 mt-2 mb-6 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                   >
                       <Archive size={16} />
                       Geçmiş Dönem Arşivi ({archivedHistory.length} kayıt)
                   </button>
               )}
          </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Edit Student */}
      <Dialog isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Öğrenci Düzenle" actions={
          <>
            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button>
            <button onClick={handleUpdateStudent} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Kaydet</button>
          </>
      }>
          <div className="space-y-3 py-2">
              <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Ad Soyad" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
              <input type="tel" value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="Telefon" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
              <input type="number" value={editFee} onChange={e=>setEditFee(e.target.value)} placeholder="Aylık Ücret" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Kalıcı olarak sil</span>
                  <button onClick={() => { actions.deleteStudent(studentId); onBack(); }} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100">Öğrenciyi Sil</button>
              </div>
          </div>
      </Dialog>

      {/* 2. Past Lesson */}
      <Dialog isOpen={isPastLessonModalOpen} onClose={() => setIsPastLessonModalOpen(false)} title="Geçmiş Ders Ekle" actions={
          <>
            <button onClick={() => setIsPastLessonModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button>
            <button onClick={handleAddPastLesson} disabled={!pastDate} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">Ekle</button>
          </>
      }>
          <div className="py-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TARİH</label>
              <input type="date" value={pastDate} onChange={e=>setPastDate(e.target.value)} max={getTodayString()} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" />
          </div>
      </Dialog>

      {/* 3. Payment */}
      <Dialog isOpen={isPastPaymentModalOpen} onClose={() => setIsPastPaymentModalOpen(false)} title="Ödeme Ekle" actions={
          <>
            <button onClick={() => setIsPastPaymentModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button>
            <button onClick={handleAddPastPayment} disabled={!pastPaymentDate || !pastPaymentAmount} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">Kaydet</button>
          </>
      }>
          <div className="py-2 space-y-3">
              <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TARİH</label>
                  <input type="date" value={pastPaymentDate} onChange={e=>setPastPaymentDate(e.target.value)} max={getTodayString()} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" />
              </div>
              <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">MİKTAR (TL)</label>
                  <input type="number" value={pastPaymentAmount} onChange={e=>setPastPaymentAmount(e.target.value)} placeholder="0.00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" />
              </div>
          </div>
      </Dialog>

      {/* 4. Lesson Options */}
      <Dialog isOpen={isLessonOptionsOpen} onClose={() => setIsLessonOptionsOpen(false)} title="İşlem Detayı">
          <div className="flex flex-col gap-2 py-1">
              {selectedTx?.isDebt && !selectedTx.note.includes("Telafi Bekliyor") && (
                  <>
                    <button onClick={() => handleLessonAction('ABSENT')} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-sm flex items-center gap-2">
                        <XCircle size={16} /> Gelmedi Olarak İşaretle
                    </button>
                    <button onClick={() => handleLessonAction('MAKEUP')} className="p-3 bg-orange-50 text-orange-700 rounded-xl font-bold text-sm flex items-center gap-2">
                        <RefreshCcw size={16} /> Telafi Hakkı Tanımla
                    </button>
                  </>
              )}
               
              {selectedTx?.note.includes("Telafi Bekliyor") && (
                   <button onClick={() => handleLessonAction('MAKEUP_DONE')} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm flex items-center gap-2">
                      <CheckCircle2 size={16} /> Telafi Yapıldı Olarak İşaretle
                   </button>
              )}

              <button onClick={() => handleLessonAction('DELETE')} className="p-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2 mt-2">
                  <Trash2 size={16} /> Kaydı Sil
              </button>
          </div>
      </Dialog>

      {/* 5. Makeup Complete Date Picker */}
      <Dialog isOpen={isMakeupCompleteModalOpen} onClose={() => setIsMakeupCompleteModalOpen(false)} title="Telafi Tarihi" actions={
           <>
             <button onClick={() => setIsMakeupCompleteModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button>
             <button onClick={handleMakeupComplete} disabled={!makeupCompleteDate} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">Onayla</button>
           </>
      }>
          <div className="py-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">TELAFİ YAPILAN TARİH</label>
              <input type="date" value={makeupCompleteDate} onChange={e=>setMakeupCompleteDate(e.target.value)} max={getTodayString()} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" />
          </div>
      </Dialog>

      {/* 6. Resources Modal */}
      <Dialog isOpen={isResourcesModalOpen} onClose={() => setIsResourcesModalOpen(false)} title="Materyal Ekle" actions={
          <>
            <button onClick={() => setIsResourcesModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Kapat</button>
            <button onClick={handleAddResource} disabled={!resTitle || !resUrl} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">Ekle</button>
          </>
      }>
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button onClick={() => setResTab('LINK')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${resTab === 'LINK' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Link</button>
              <button onClick={() => setResTab('UPLOAD')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${resTab === 'UPLOAD' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Dosya Yükle</button>
          </div>

          <div className="space-y-3">
               <input type="text" value={resTitle} onChange={e=>setResTitle(e.target.value)} placeholder="Başlık (Örn: Ödev 1)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
               
               {resTab === 'LINK' ? (
                   <input type="url" value={resUrl} onChange={e=>setResUrl(e.target.value)} placeholder="Link (YouTube, Drive vb.)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
               ) : (
                   <div className="flex gap-2">
                       <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1 p-8 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50 text-indigo-500 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                           {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                           <span className="text-xs font-bold">{isUploading ? 'Yükleniyor...' : 'Dosya Seç (Resim/PDF)'}</span>
                       </button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                   </div>
               )}
               
               {resUrl && resTab === 'UPLOAD' && (
                   <div className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg flex items-center gap-2">
                       <Check size={14} /> Dosya başarıyla yüklendi
                   </div>
               )}
          </div>
      </Dialog>

      {/* 7. Archive Modal */}
      <Dialog isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Geçmiş Arşivi">
        <div className="py-2 max-h-[60vh] overflow-y-auto pr-1">
             <div className="relative space-y-4 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 before:-z-10 pb-2">
                {archivedHistory.map(renderTransactionItem)}
             </div>
        </div>
      </Dialog>

    </div>
  );
};
