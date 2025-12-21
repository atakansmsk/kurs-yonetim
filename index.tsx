
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// GLOBAL ERROR HANDLER FOR STARTUP CRASHES
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && (root.innerHTML === "" || root.innerText.includes("YÜKLENİYOR"))) {
    root.innerHTML = `
      <div style="padding: 40px; font-family: system-ui, -apple-system, sans-serif; text-align: center; color: #334155; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc;">
        <div style="background: #fee2e2; color: #ef4444; padding: 20px; border-radius: 20px; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </div>
        <h2 style="font-weight: 900; letter-spacing: -0.025em; font-size: 20px; margin-bottom: 8px;">Başlatma Hatası</h2>
        <p style="font-size: 14px; color: #64748b; max-width: 280px; margin-bottom: 24px;">Uygulama yüklenirken teknik bir sorun oluştu.</p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 12px; text-align: left; font-size: 11px; font-family: monospace; overflow: auto; max-width: 320px; color: #475569; border: 1px solid #e2e8f0;">
          ${event.message}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 24px; padding: 12px 24px; background: #4f46e5; color: #fff; border: none; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">Yeniden Dene</button>
      </div>
    `;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element bulunamadı.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
