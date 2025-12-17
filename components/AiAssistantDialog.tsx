import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { Student } from '../types';
import { GeminiService } from '../services/gemini';
import { Sparkles, MessageCircle, Copy, RefreshCw, Wand2, BarChart3, Send } from 'lucide-react';

interface AiAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

const TOPICS = [
  "Ödeme Hatırlatması",
  "Ders Raporu / Geri Bildirim",
  "Ders İptal Bilgilendirmesi",
  "Ödev Hatırlatması",
  "Telafi Dersi Planlama",
  "Bayram / Özel Gün Kutlaması"
];

const TONES = [
  { key: 'friendly', label: 'Samimi' },
  { key: 'formal', label: 'Resmi' },
  { key: 'direct', label: 'Net' }
];

export const AiAssistantDialog: React.FC<AiAssistantDialogProps> = ({ isOpen, onClose, student }) => {
  const [activeTab, setActiveTab] = useState<'MESSAGE' | 'ANALYSIS'>('MESSAGE');
  
  // Message State
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'formal' | 'direct'>('friendly');
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState("");

  const handleGenerateMessage = async () => {
    setLoading(true);
    try {
      const msg = await GeminiService.generateMessage(student, selectedTopic, selectedTone);
      setGeneratedMessage(msg);
    } catch (e) {
      setGeneratedMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await GeminiService.analyzeStudent(student);
      setAnalysisResult(result);
    } catch (e) {
      setAnalysisResult("Analiz yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const sendToWhatsapp = () => {
    const phone = student.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(generatedMessage)}`;
    window.open(url, '_blank');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    alert("Kopyalandı!");
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="AI Asistanı">
      <div className="flex flex-col h-[60vh] sm:h-auto">
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 shrink-0">
            <button 
                onClick={() => setActiveTab('MESSAGE')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'MESSAGE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
            >
                <MessageCircle size={14} /> Mesaj Oluşturucu
            </button>
            <button 
                onClick={() => setActiveTab('ANALYSIS')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-400'}`}
            >
                <BarChart3 size={14} /> Öğrenci Analizi
            </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
            {activeTab === 'MESSAGE' ? (
                <div className="space-y-4 py-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Konu</label>
                        <select 
                            value={selectedTopic} 
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm outline-none focus:border-indigo-500 appearance-none"
                        >
                            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hitabet Tonu</label>
                        <div className="flex gap-2">
                            {TONES.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setSelectedTone(t.key as any)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${selectedTone === t.key ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!generatedMessage && (
                        <button 
                            onClick={handleGenerateMessage}
                            disabled={loading}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Wand2 size={18} />}
                            {loading ? 'Yazılıyor...' : 'Taslak Oluştur'}
                        </button>
                    )}

                    {generatedMessage && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Oluşturulan Mesaj</label>
                            <textarea 
                                value={generatedMessage}
                                onChange={(e) => setGeneratedMessage(e.target.value)}
                                className="w-full h-32 p-3 bg-white border border-indigo-100 rounded-xl text-sm leading-relaxed text-slate-700 focus:border-indigo-300 outline-none resize-none shadow-sm"
                            />
                            
                            <div className="flex gap-2 mt-3">
                                <button onClick={handleGenerateMessage} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100" title="Yeniden Oluştur">
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button onClick={copyToClipboard} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100" title="Kopyala">
                                    <Copy size={18} />
                                </button>
                                <button onClick={sendToWhatsapp} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                                    <Send size={16} /> WhatsApp'ta Aç
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 py-1 h-full flex flex-col">
                    {!analysisResult && (
                        <div className="flex flex-col items-center justify-center flex-1 text-center p-4">
                            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-3 text-purple-500">
                                <Sparkles size={32} />
                            </div>
                            <h4 className="font-bold text-slate-800">Öğrenci Analizi</h4>
                            <p className="text-xs text-slate-400 mt-1 mb-4">
                                Geçmiş ders, ödeme ve not verilerini Gemini AI ile analiz ederek içgörüler edinin.
                            </p>
                            <button 
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <RefreshCw size={18} className="animate-spin" /> : <BarChart3 size={18} />}
                                {loading ? 'Analiz Ediliyor...' : 'Analizi Başlat'}
                            </button>
                        </div>
                    )}

                    {analysisResult && (
                        <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="prose prose-sm prose-purple max-w-none text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {analysisResult}
                            </div>
                            <button 
                                onClick={handleAnalyze}
                                className="w-full mt-4 py-3 bg-white border border-purple-100 text-purple-600 rounded-xl font-bold text-xs hover:bg-purple-50 transition-colors"
                            >
                                Analizi Yenile
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </Dialog>
  );
};