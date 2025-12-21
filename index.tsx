
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error("Root element bulunamadı.");
}

const root = createRoot(container);

window.addEventListener('error', (event) => {
  // Yalnızca uygulama hiç başlamadıysa hata ekranı göster
  if (container.innerText.includes("BAŞLATILIYOR")) {
    container.innerHTML = `
      <div style="padding: 40px; font-family: system-ui, sans-serif; text-align: center; color: #334155; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc;">
        <h2 style="font-weight: 900; font-size: 20px;">Sistem Hatası</h2>
        <p style="font-size: 14px; color: #64748b; margin: 10px 0;">Uygulama yüklenirken bir sorun oluştu.</p>
        <code style="background: #f1f5f9; padding: 10px; border-radius: 10px; font-size: 11px;">${event.message}</code>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">Tekrar Dene</button>
      </div>
    `;
  }
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
