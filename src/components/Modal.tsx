import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  narrow?: boolean;
  children: ReactNode;
}

export function Modal({ title, onClose, narrow, children }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${narrow ? 'narrow' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
