import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useCourse } from '../context/CourseContext';
import { useAuth } from '../context/AuthContext';
import { Phone, Check, Banknote, ArrowLeft, Trash2, MessageCircle, Pencil, Wallet, RefreshCcw, CheckCircle2, Share2, Link, Youtube, FileText, Image, Plus, UploadCloud, X, Loader2, Globe, BellRing, XCircle, Layers, Archive, Activity, CalendarDays, TrendingUp, Eye } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { Transaction } from '../types';
import { FileService } from '../services/api';

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
  
  // File Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'IMAGE' | 'PDF' | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
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
  
  // UPLOAD STATE
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Yeni: Dosya hazırlama durumu
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Auto-fill payment amount when modal opens
  useEffect(() => {
      if (isPastPaymentModalOpen && student) {
          setPastPaymentAmount(student.fee.toString());
      }
  }, [isPastPaymentModalOpen, student]);

  // --- SORTER ---
  const sortedHistory = useMemo(() => {
      if (!student) return [];
      return [...student.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student]);

  // --- HISTORY SPLITTER ---
  const { currentHistory, archivedHistory, debtCount } = useMemo(() => {
      if (!student) return { currentHistory: [], archivedHistory: [], debtCount: 0 };
      
      const lastPaymentIndex = sortedHistory.findIndex(tx => !tx.isDebt);
      
      let current: Transaction[] = [];
      let archived: Transaction[] = [];

      if (lastPaymentIndex !== -1) {
          current = sortedHistory.slice(0, lastPaymentIndex + 1);
          archived = sortedHistory.slice(lastPaymentIndex + 1);
      } else {
          current = sortedHistory;
      }

      const debtLessons = current.filter(tx => 
          tx.isDebt && 
          !tx.note.toLowerCase().includes("telafi") && 
          !tx.note.toLowerCase().includes("deneme") 
      );

      return { currentHistory: current, archivedHistory: archived, debtCount: debtLessons.length };
  }, [sortedHistory]);
  
  const lessonNumberMap = useMemo(() => {
      if (!student) return new Map();
      const map = new Map<string, number>();
      
      const allRegularLessons = sortedHistory.filter(tx => 
        tx.isDebt && 
        !tx.note.toLowerCase().includes("telafi") && 
        !tx.note.toLowerCase().includes("deneme") && 
        !tx.note.toLowerCase().includes("iptal")
      );
      
      const ascLessons = [...allRegularLessons].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      ascLessons.forEach((tx, index) => {
          map.set(tx.id, index + 1);
      });
      return map;
  }, [sortedHistory]);

  const currentMonthName = useMemo(() => {
      return new Date().toLocaleDateString('tr-TR', { month: 'long' });
  }, []);

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
      let message = "";
      if (resourceUrl.startsWith('http')) {
          message = `Merhaba ${student.name}, senin için yeni bir materyal ekledim. Buradan ulaşabilirsin:\n\n*${title}*\n${resourceUrl}`;
      } else {
          message = `Merhaba ${student.name}, senin için yeni bir dosya ekledim. Veli Portalından görüntüleyebilirsin.`;
      }
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

  // --- COMPRESSION AND UPLOAD LOGIC ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // Reset State
      setIsProcessing(true); // Dosya işleniyor göstergesi
      setUploadStatusText("Dosya hazırlanıyor...");
      event.target.value = ""; // Reset input
      
      try {
          // PDF Logic
          if (file.type === 'application/pdf') {
              if (file.size > 3 * 1024 * 1024) { 
                  alert("PDF dosyaları en fazla 3MB olabilir. Lütfen daha küçük bir dosya seçin.");
                  setIsProcessing(false);
                  return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                  setResUrl(reader.result as string);
                  setResType('PDF');
                  if (!resTitle) setResTitle(`Ödev ${new Date().toLocaleDateString('tr-TR')}`);
                  setUploadStatusText("PDF Hazır");
                  setIsProcessing(false);
              };
              reader.readAsDataURL(file);
          } 
          // IMAGE Logic (Optimized Compression)
          else if (file.type.startsWith('image/')) {
              const img = document.createElement('img');
              const objectUrl = URL.createObjectURL(file);
              
              img.onload = () => {
                  URL.revokeObjectURL(objectUrl);
                  
                  // Aggressive resizing for reliable uploads
                  const MAX_DIMENSION = 1024; 
                  let newWidth = img.width;
                  let newHeight = img.height;

                  if (newWidth > MAX_DIMENSION || newHeight > MAX_DIMENSION) {
                      if (newWidth > newHeight) {
                          newHeight = Math.round((newHeight * MAX_DIMENSION) / newWidth);
                          newWidth = MAX_DIMENSION;
                      } else {
                          newWidth = Math.round((newWidth * MAX_DIMENSION) / newHeight);
                          newHeight = MAX_DIMENSION;
                      }
                  }

                  const canvas = document.createElement('canvas');
                  canvas.width = newWidth;
                  canvas.height = newHeight;
                  
                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                      alert("Görüntü işlenemedi.");
                      setIsProcessing(false);
                      return;
                  }

                  ctx.drawImage(img, 0, 0, newWidth, newHeight);
                  
                  // Convert to JPEG with lower quality (0.6) for smaller size
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                  
                  setResUrl(dataUrl);
                  setResType('IMAGE');
                  if (!resTitle) setResTitle(`Görsel ${new Date().toLocaleDateString('tr-TR')}`);
                  
                  setUploadStatusText("Fotoğraf Sıkıştırıldı");
                  setIsProcessing(false);
              };

              img.onerror = () => {
                  alert("Resim yüklenirken hata oluştu.");
                  setIsProcessing(false);
              };

              img.src = objectUrl;
          } 
          else {
              alert("Sadece Resim ve PDF dosyaları desteklenir.");
              setIsProcessing(false);
          }
      } catch (error) {
          console.error("İşleme hatası:", error);
          alert("Dosya hazırlanamadı.");
          setIsProcessing(false);
      }
  };

  const handleAddResource = async () => {
      if(resTitle && resUrl && user) {
          let finalType = resType;
          let finalUrlOrId = resUrl;

          // Dosya yükleme modundaysa ve URL base64 ise
          if (resTab === 'UPLOAD' && (resUrl.startsWith('data:'))) {
              try {
                  setIsUploading(true);
                  setUploadStatusText("Buluta Yükleniyor...");
                  setUploadProgress(10); // Start progress bar

                  // Pass progress callback AND USER ID
                  const fileId = await FileService.saveFile(user.id, resUrl, (progress) => {
                      setUploadProgress(progress);
                      setUploadStatusText(progress === 100 ? "Tamamlandı!" : `Yükleniyor %${progress}`);
                  });

                  finalUrlOrId = fileId;
                  setUploadStatusText("Tamamlandı!");
                  // Short delay to show 100%
                  await new Promise(r => setTimeout(r, 500));

              } catch (e: any) {
                  alert(e.message || "Yükleme başarısız. İnternet bağlantınızı kontrol edin.");
                  setIsUploading(false);
                  setUploadProgress(0);
                  return;
              } finally {
                  setIsUploading(false);
              }
          } else if (resTab === 'LINK') {
              finalType = 'LINK';
              if (finalUrlOrId.includes('youtube.com') || finalUrlOrId.includes('youtu.be')) finalType = 'VIDEO';
              if (finalUrlOrId.endsWith('.pdf')) finalType = 'PDF';
              if (!finalUrlOrId.startsWith('http://') && !finalUrlOrId.startsWith('https://')) finalUrlOrId = `https://${finalUrlOrId}`;
          }

          actions.addResource(studentId, resTitle, finalUrlOrId, finalType);
          
          // Reset Form
          setResTitle(""); setResUrl(""); setResType('LINK');
          setUploadProgress(0); setUploadStatusText("");
          setIsResourcesModalOpen(false); // Close modal on success
      }
  };

  // --- PREVIEW LOGIC ---
  const handleOpenResource = async (res: any) => {
      if (res.type === 'LINK' || res.type === 'VIDEO') {
          window.open(res.url, '_blank');
      } else {
          setIsPreviewLoading(true);
          setIsPreviewOpen(true);
          setPreviewType(res.type);
          setPreviewContent(null);

          let content = res.url;
          if (!content.startsWith('data:') && !content.startsWith('http')) {
               // Use user.id as ownerId for fetching
               if (user) {
                   const fetched = await FileService.getFile(user.id, content);
                   if (fetched) {
                       content = fetched;
                   } else {
                       alert("Dosya bulunamadı veya silinmiş.");
                       setIsPreviewOpen(false);
                       setIsPreviewLoading(false);
                       return;
                   }
               }
          }

          setPreviewContent(content);
          setIsPreviewLoading(false);
      }
  };

  const renderTransactionItem = (tx: Transaction) => {
      const isPayment = !tx.isDebt;
      const dateObj = new Date(tx.date);
      const day = dateObj.toLocaleDateString('tr-TR', { day: 'numeric' });
      const month = dateObj.toLocaleDateString('tr-TR', { month: 'short' });
      
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

      {/* 2. Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10 space-y-6">
          
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 text-white shadow-xl shadow-indigo-200 flex flex-col justify-between h-48 group">
                  <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-white/10 rounded-full blur-[40px] pointer-events-none"></div>
                  <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-purple-500/30 rounded-full blur-[50px] pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col h-full justify-between">
                     <div>
                        <div className="flex items-center gap-2 mb-2 text-indigo-200 opacity-90">
                           <TrendingUp size={16} />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Ders Sayacı</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                           <span className="text-6xl font-black tracking-tighter drop-shadow-sm">{displayedLessonCount}</span>
                           <span className="text-sm font-bold text-indigo-200 uppercase tracking-wide">Ders</span>
                        </div>
                        <p className="text-[9px] text-indigo-200 font-medium mt-1 opacity-70">Bu dönem işlenen</p>
                     </div>

                     <button 
                        onClick={() => setIsPastLessonModalOpen(true)}
                        className="mt-auto w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/10"
                     >
                        <Plus size={14} strokeWidth={3} /> Ders Ekle
                     </button>
                  </div>
              </div>

              <div className="relative overflow-hidden rounded-[24px] bg-white border border-slate-100 p-5 shadow-lg shadow-slate-100/80 flex flex-col justify-between h-48">
                   <div className="absolute top-0 right-0 p-4 opacity-5">
                       <Wallet size={80} className="text-slate-900" />
                   </div>

                  <div className="relative z-10 flex flex-col h-full justify-between">
                     <div>
                        <div className="flex items-center gap-2 mb-2 text-slate-400">
                           <Wallet size={16} />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Aylık Ücret</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl font-black text-slate-800 tracking-tighter">{student.fee}</span>
                           <span className="text-lg font-bold text-slate-400">TL</span>
                        </div>
                     </div>

                     <button 
                        onClick={() => setIsPastPaymentModalOpen(true)}
                        className="mt-auto w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-[0.98]"
                     >
                        <Banknote size={14} strokeWidth={2.5} /> Ödeme Al
                     </button>
                  </div>
              </div>

          </div>

          {/* RESOURCES SECTION */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Link size={14} /> Materyaller
                  </h3>
                  <button onClick={() => { setIsResourcesModalOpen(true); setUploadProgress(0); setUploadStatusText(""); }} className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors">
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
                                  <button onClick={() => handleOpenResource(res)} className="flex-1 text-center text-[10px] font-bold bg-slate-50 text-slate-600 py-1 rounded hover:bg-slate-100 flex items-center justify-center gap-1">
                                      <Eye size={10} /> Aç
                                  </button>
                                  <button onClick={() => handleShareResource(res.title, res.url)} className="w-6 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"><Share2 size={12} /></button>
                                  <button onClick={async () => {
                                      if (res.type === 'IMAGE' || res.type === 'PDF') {
                                           if(!res.url.startsWith('http') && !res.url.startsWith('data:') && user) {
                                               await FileService.deleteFile(user.id, res.url);
                                           }
                                      }
                                      actions.deleteResource(studentId, res.id);
                                  }} className="w-6 flex items-center justify-center bg-red-50 text-red-500 rounded hover:bg-red-100"><X size={12} /></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* HISTORY */}
          <div>
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays size={14} /> {currentMonthName} Ayı Ders Tarihleri
                  </h3>
               </div>
               <div className="relative space-y-4 before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 before:-z-10 pb-6">
                  {currentHistory.length === 0 ? (
                      <div className="bg-white rounded-[1.5rem] border border-slate-100 border-dashed p-6 text-center shadow-sm">
                          <p className="text-slate-900 font-bold text-xs">Hareket Yok</p>
                      </div>
                  ) : (
                      currentHistory.map((tx) => renderTransactionItem(tx))
                  )}
               </div>
               {archivedHistory.length > 0 && (
                  <button onClick={() => setIsArchiveModalOpen(true)} className="w-full py-4 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                      <Archive size={14} />
                      Geçmiş Dönem Kayıtları ({archivedHistory.length})
                  </button>
               )}
          </div>
      </div>

      {/* --- MODALS --- */}
      <Dialog isOpen={isPastLessonModalOpen} onClose={() => setIsPastLessonModalOpen(false)} title="Geçmiş Ders Ekle" 
          actions={<><button onClick={() => setIsPastLessonModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleAddPastLesson} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Ekle</button></>}
      >
          <div className="py-2"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tarih</label><input type="date" value={pastDate} onChange={(e) => setPastDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" /></div>
      </Dialog>

      <Dialog isOpen={isPastPaymentModalOpen} onClose={() => setIsPastPaymentModalOpen(false)} title="Ödeme Ekle" 
          actions={<><button onClick={() => setIsPastPaymentModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleAddPastPayment} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm">Kaydet</button></>}
      >
          <div className="flex flex-col gap-3 py-2">
              <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tarih</label><input type="date" value={pastPaymentDate} onChange={(e) => setPastPaymentDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tutar (TL)</label><input type="number" value={pastPaymentAmount} onChange={(e) => setPastPaymentAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" placeholder="0.00" /></div>
          </div>
      </Dialog>

      <Dialog isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Öğrenci Düzenle" 
          actions={<><button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleUpdateStudent} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm">Güncelle</button></>}
      >
          <div className="flex flex-col gap-3 py-2">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" placeholder="İsim" />
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" placeholder="Telefon" />
              <input type="number" value={editFee} onChange={(e) => setEditFee(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" placeholder="Ücret" />
          </div>
      </Dialog>
      
      <Dialog isOpen={isLessonOptionsOpen} onClose={() => setIsLessonOptionsOpen(false)} title="İşlem Seçin">
          <div className="flex flex-col gap-2 py-2">
              {selectedTx?.isDebt && !selectedTx.note.includes('Telafi') && (
                  <><button onClick={() => handleLessonAction('ABSENT')} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-sm flex items-center gap-2"><XCircle size={16} /> Gelmedi Olarak İşaretle</button><button onClick={() => handleLessonAction('MAKEUP')} className="p-3 bg-orange-50 text-orange-700 rounded-xl font-bold text-sm flex items-center gap-2"><RefreshCcw size={16} /> Telafi Hakkı Tanı</button></>
              )}
              {selectedTx?.note.includes('Telafi Bekliyor') && (<button onClick={() => handleLessonAction('MAKEUP_DONE')} className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm flex items-center gap-2"><CheckCircle2 size={16} /> Telafi Yapıldı Olarak İşaretle</button>)}
              <button onClick={() => handleLessonAction('DELETE')} className="p-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm flex items-center gap-2"><Trash2 size={16} /> Kaydı Sil</button>
          </div>
      </Dialog>

      <Dialog isOpen={isMakeupCompleteModalOpen} onClose={() => setIsMakeupCompleteModalOpen(false)} title="Telafi Tarihi" actions={<><button onClick={() => setIsMakeupCompleteModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button><button onClick={handleMakeupComplete} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm">Tamamla</button></>}>
           <div className="py-2"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telafi Yapılan Tarih</label><input type="date" value={makeupCompleteDate} onChange={(e) => setMakeupCompleteDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" /></div>
      </Dialog>
      
      {/* UPLOAD MODAL - Updated with Progress */}
      <Dialog isOpen={isResourcesModalOpen} onClose={() => { if(!isUploading && !isProcessing) { setIsResourcesModalOpen(false); setResUrl(""); setResTitle(""); setResType('LINK'); setUploadProgress(0); setUploadStatusText(""); } }} title="Materyal Ekle"
           actions={
              !isUploading && !isProcessing && (
                  <>
                      <button onClick={() => setIsResourcesModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">İptal</button>
                      <button onClick={handleAddResource} disabled={!resTitle || !resUrl} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">Ekle</button>
                  </>
              )
          }
      >
          <div className="flex flex-col gap-3 py-1">
              {/* Tabs only if not uploading */}
              {!isUploading && !isProcessing && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setResTab('LINK')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${resTab === 'LINK' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Link / Video</button>
                    <button onClick={() => setResTab('UPLOAD')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${resTab === 'UPLOAD' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Dosya Yükle</button>
                </div>
              )}

              {/* Title Input */}
              {!isUploading && !isProcessing && (
                <input type="text" value={resTitle} onChange={e=>setResTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none" placeholder="Başlık (Örn: Ödev 1)" />
              )}
              
              {isUploading || isProcessing ? (
                  // UPLOAD PROGRESS VIEW
                  <div className="flex flex-col items-center justify-center py-6 gap-3">
                      {isProcessing ? (
                          <div className="flex flex-col items-center gap-2">
                             <Loader2 size={40} className="text-indigo-600 animate-spin" />
                          </div>
                      ) : (
                          <div className="relative w-16 h-16">
                               <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                                   <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175} strokeDashoffset={175 - (175 * uploadProgress) / 100} className="text-indigo-600 transition-all duration-300 ease-linear" />
                               </svg>
                               <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-indigo-600">{uploadProgress}%</div>
                          </div>
                      )}
                      <div className="text-center">
                          <p className="font-bold text-slate-800 text-sm">{uploadStatusText}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Lütfen bekleyin, kapatmayın...</p>
                      </div>
                  </div>
              ) : (
                  // NORMAL VIEW
                  resTab === 'LINK' ? (
                      <input type="text" value={resUrl} onChange={e=>setResUrl(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none" placeholder="https://..." />
                  ) : (
                      <div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*,application/pdf" 
                            onChange={handleFileUpload} 
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isUploading}
                            className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 hover:border-indigo-200 transition-colors"
                          >
                              {resUrl ? (
                                  <>
                                    <CheckCircle2 size={24} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-600">{resType === 'PDF' ? 'PDF Hazır' : 'Resim Hazır'}</span>
                                  </>
                              ) : (
                                  <>
                                    <UploadCloud size={24} />
                                    <span className="text-xs font-bold">Resim veya PDF Seç</span>
                                  </>
                              )}
                          </button>
                      </div>
                  )
              )}
          </div>
      </Dialog>
      
      <Dialog isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Geçmiş Kayıtlar">
          <div className="max-h-[60vh] overflow-y-auto space-y-4 py-2 pr-1 custom-scrollbar">
               {archivedHistory.length === 0 ? <p className="text-center text-slate-400 text-sm">Kayıt yok.</p> : archivedHistory.map(tx => renderTransactionItem(tx))}
          </div>
      </Dialog>

      <Dialog 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        title="Dosya Önizleme"
        actions={<button onClick={() => setIsPreviewOpen(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm">Kapat</button>}
      >
          <div className="flex items-center justify-center min-h-[200px] max-h-[60vh] overflow-auto bg-slate-50 rounded-xl p-2 border border-slate-100">
              {isPreviewLoading ? (
                  <div className="flex flex-col items-center gap-2"><Loader2 size={32} className="animate-spin text-indigo-600" /><span className="text-xs font-bold text-slate-400">Yükleniyor...</span></div>
              ) : previewContent ? (
                  previewType === 'IMAGE' ? (<img src={previewContent} alt="Preview" className="max-w-full h-auto rounded-lg shadow-sm" />) : (<iframe src={previewContent} className="w-full h-[300px] rounded-lg" title="PDF Preview"></iframe>)
              ) : (
                  <div className="flex flex-col items-center gap-2"><XCircle size={32} className="text-red-300" /><span className="text-xs font-bold text-slate-400">Dosya görüntülenemedi.</span></div>
              )}
          </div>
      </Dialog>

    </div>
  );
};