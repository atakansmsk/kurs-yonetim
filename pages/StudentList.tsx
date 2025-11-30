

import React, { useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { Student } from '../types';
import { Trash2, Search, ChevronRight, UserPlus, Phone, User, MessageSquare, Copy, Send, MessageCircle } from 'lucide-react';
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
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Bulk Message
  const [bulkMessage, setBulkMessage] = useState("");

  const students = (Object.values(state.students) as Student[])
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const handleAddStudent = () => {
      if(newName) {
          actions.addStudent(newName, newPhone, parseFloat(newFee) || 0, newStartDate);
          setIsAddModalOpen(false);
          setNewName(""); setNewPhone(""); setNewFee("");
          setNewStartDate(new Date().toISOString().split('T')[0]);
      }
  }

  const getCleanNumbers = () => {
      return students
        .map(s => s.phone.replace(/[^0-9]/g, ''))
        .filter(n => n.length >= 7); // Geçerli olabilecek en kısa numara kontrolü
  };

  const handleCopyNumbers = () => {
      const numbers = getCleanNumbers().join(', ');
      navigator.clipboard.writeText(numbers);
      alert(`${students.length} numara kopyalandı!`);
  };

  const handleBulkSMS = () => {
      const numbers = getCleanNumbers().join(',');
      if (!numbers) return;

      // iOS ve Android için ayırıcı ve body parametresi fark edebilir, genelde bu format çalışır
      // iOS: &body= , Android: ?body=
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

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] p-4 pb-24">
      
      {/* Header & Buttons */}
      <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Öğrenciler</h2>
          <div className="flex gap-2">
            <button 
                onClick={() => setIsBulkModalOpen(true)}
                className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100 hover:scale-105 active:scale-95 transition-all"
                title="Toplu İletişim"
            >
                <MessageSquare size={18} />
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
            >
                <UserPlus size={18} />
            </button>
          </div>
      </div>
      
      {/* Search */}
      <div className="relative mb-4 group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
        </div>
        <input 
            type="text" 
            placeholder="İsim ara..." 
            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4">
        {students.length === 0 ? (
             <div className="flex flex-col items-center justify-center mt-10 text-slate-300 opacity-60 animate-slide-up">
                <Search size={32} className="mb-2" />
                <p className="font-bold text-sm">Kayıt bulunamadı.</p>
             </div>
        ) : (
            students.map((student, idx) => (
                <div 
                    key={student.id} 
                    className="group bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:border-indigo-100 transition-all duration-200 flex items-center gap-3 cursor-pointer active:scale-[0.99] animate-slide-up"
                    style={{ animationDelay: `${idx * 0.03}s` }}
                    onClick={() => onSelect(student.id)}
                >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{student.name}</h4>
                        {student.phone && <p className="text-[10px] text-slate-400 font-medium truncate">{student.phone}</p>}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(student.id); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))
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
             <div>
                <input type="number" value={newFee} onChange={e=>setNewFee(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" placeholder="Aylık Ücret" />
             </div>
             <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">BAŞLANGIÇ TARİHİ</label>
                <input type="date" value={newStartDate} onChange={e=>setNewStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none" />
             </div>
          </div>
      </Dialog>

      {/* Bulk Message Modal (SMS) */}
      <Dialog isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Toplu SMS">
        <div className="flex flex-col gap-4 py-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600 text-xs font-medium">
                Tüm öğrencilere telefonunuzun SMS uygulaması üzerinden toplu mesaj gönderir. Numaraları kaydetmenize gerek yoktur.
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
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Taslak Mesaj</p>
                <textarea 
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Mesajınızı buraya yazın..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium h-24 resize-none mb-3 focus:border-indigo-500 outline-none"
                />
                
                <div className="max-h-[25vh] overflow-y-auto space-y-2 pr-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Bireysel Gönderim</p>
                    {students.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{s.name}</span>
                            <button 
                                onClick={() => handleSendToStudent(s.phone)}
                                disabled={!s.phone}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-slate-100 disabled:opacity-50"
                            >
                                <Send size={12} /> SMS
                            </button>
                        </div>
                    ))}
                </div>
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