'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ModalDialog.module.css';

interface ModalDialogProps {
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function ModalDialog({ onClose, labelledBy, className, children }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => trigger?.focus();
  }, []);

  useEffect(() => {
    // aria-modal only claims the rest of the page is inert; Tab has to be contained to make it true.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const stops = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (stops.length === 0) return;

      const first = stops[0];
      const last = stops[stops.length - 1];
      const leavingBackwards = e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current);
      const leavingForwards = !e.shiftKey && document.activeElement === last;

      if (leavingBackwards) {
        e.preventDefault();
        last.focus();
      } else if (leavingForwards) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Portalled so a transformed ancestor cannot become this fixed overlay's containing block and clip it.
  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        e.stopPropagation(); // Portalled events still bubble the React tree, into whatever rendered the trigger.
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={className ? `${styles.dialog} ${className}` : styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
