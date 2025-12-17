import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiService = {
  async generateMessage(student: Student, topic: string, tone: 'formal' | 'friendly' | 'direct'): Promise<string> {
    // Summarize recent history for context
    const recentHistory = student.history
      .slice(0, 5)
      .map(h => `${h.date.split('T')[0]}: ${h.note} (${h.isDebt ? 'Ders' : 'Ödeme'})`)
      .join('\n');

    const prompt = `
      Sen profesyonel bir özel ders/kurs yönetim asistanısın. Aşağıdaki öğrenci ve durum bilgisine göre veliye gönderilecek bir WhatsApp mesajı hazırla.

      Öğrenci Bilgileri:
      - İsim: ${student.name}
      - Toplam Borçlu Ders Sayısı: ${student.debtLessonCount}
      - Son Hareketler:
      ${recentHistory}

      Görev Detayları:
      - Konu: ${topic}
      - Ton: ${tone === 'formal' ? 'Resmi ve Saygılı' : tone === 'friendly' ? 'Samimi, İçten ve Teşvik Edici' : 'Kısa, Net ve Bilgi Odaklı'}
      
      Kurallar:
      - Mesaj sadece içeriği barındırmalıdır. Başlık veya açıklama ekleme.
      - WhatsApp formatına uygun (emoji kullanılabilir) olsun.
      - Yer tutucu (placeholder) bırakma, bilgileri verilerden doldur.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "Mesaj oluşturulamadı.";
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  },

  async analyzeStudent(student: Student): Promise<string> {
    const historySummary = student.history
      .map(h => `${h.date.split('T')[0]} (${h.isDebt ? 'Ders' : 'Ödeme'}): ${h.note} - Tutar: ${h.amount}`)
      .join('\n');

    const prompt = `
      Sen deneyimli bir eğitim koçusun. Aşağıdaki öğrenci verilerini analiz et ve eğitmen için içgörü dolu kısa bir rapor hazırla.

      Öğrenci: ${student.name}
      Kayıt Tarihi: ${student.registrationDate}
      Güncel Borç Ders: ${student.debtLessonCount}
      Telafi Bakiyesi: ${student.makeupCredit}
      
      Geçmiş Verisi:
      ${historySummary}

      Analiz Başlıkları:
      1. **Devamlılık ve İstikrar**: (Ders iptalleri, düzenli katılım durumu)
      2. **Finansal Durum**: (Ödeme düzeni, biriken borç riski var mı?)
      3. **Eğitmen İçin Öneri**: (Bu öğrenciyle ilgili ne yapılmalı?)

      Çıktıyı temiz, okunabilir bir metin olarak ver. Madde işaretleri kullan.
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text || "Analiz yapılamadı.";
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
  }
};