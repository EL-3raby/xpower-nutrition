'use client';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'حذف',
  cancelText = 'إلغاء'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-bg-elevated border border-accent-red/30 p-6 flex flex-col gap-6"
        dir="rtl"
      >
        <div className="flex items-center gap-3 border-b border-accent-red/20 pb-3">
          <span className="material-symbols-outlined text-accent-red text-2xl">warning</span>
          <h3 className="font-display text-xl font-bold text-white uppercase">{title}</h3>
        </div>
        
        <p className="font-body text-text-muted leading-relaxed text-base">
          {message}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 font-body text-sm text-text-primary hover:bg-white/10 transition-colors border border-text-muted/20"
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-accent-red hover:bg-accent-red/80 font-body text-sm text-white transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
