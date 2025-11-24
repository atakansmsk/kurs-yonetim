import React from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Dialog Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs sm:max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center px-6 pt-6 pb-2">
          <h3 className="text-xl font-bold text-textMain tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="px-6 py-4">
          {children}
        </div>
        
        {actions && (
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};