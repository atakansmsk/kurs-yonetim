import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// GLOBAL ERROR HANDLER FOR STARTUP CRASHES
// Eğer uygulama açılırken (import aşamasında) bir hata olursa beyaz ekran yerine hatayı gösterir.
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === "") {
    root.innerHTML = `
      <div style="padding: 20px; font-family: system-ui; text-align: center; color: #333;">
        <h2 style="color: #e11d48;">Uygulama Başlatılamadı</h2>
        <p>Ağ veya tarayıcı kısıtlaması algılandı.</p>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; text-align: left; font-size: 12px; font-family: monospace; overflow: auto; max-width: 100%;">
          ${event.message} <br/> ${event.filename} : ${event.lineno}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 8px; font-weight: bold;">Yeniden Dene</button>
      </div>
    `;
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);