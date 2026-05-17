import { useEffect, type ReactNode } from 'react';
import { Button } from './ui/Button';

const STORAGE_KEY = 'petsitter:welcomed:v1';

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode, etc — fine */
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function WelcomeOverlay({ onClose }: { onClose: () => void }) {
  // Lock page scroll while open so the modal stays anchored.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc closes, plus marks seen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    markSeen();
    onClose();
  };

  const installTip = isStandalone()
    ? null
    : isIOS()
      ? 'Tap the share icon and pick "Add to Home Screen". It works like a real app and is the only way iOS will send you reminders.'
      : 'In your browser menu, pick "Install" or "Add to Home Screen" — turns it into a real app and lets it send reminders.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 sm:px-4 py-3 sm:py-6 fadein"
      style={{ background: 'rgba(42,39,36,0.5)' }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        className="bg-bg max-w-md w-full rounded-[14px] border border-rule overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column' }}
      >
        <div className="px-6 pt-7 pb-2 shrink-0">
          <div className="text-[12px] uppercase tracking-widest text-ink-3">Welcome</div>
          <h2
            id="welcome-title"
            className="font-display text-[26px] font-semibold text-ink mt-0.5 leading-tight"
          >
            Everything's here.
          </h2>
        </div>

        <div className="px-6 pb-6 space-y-5 overflow-y-auto">
          <Tip label="Today">
            Your morning and night checklist. Tap to check things off — it survives a refresh.
          </Tip>
          <Tip label="Summary">
            Each pet's quirks and full care notes, the WiFi password (long-press to copy), the
            address, and any other house info.
          </Tip>
          <Tip label="Notifications">
            One-tap presets to set up daily reminders from the task list. Plus a small chat
            assistant that knows the trip details if you have a quick question.
          </Tip>
          {installTip && <Tip label="One thing">{installTip}</Tip>}
        </div>

        <div className="border-t border-rule px-6 py-4 flex justify-end shrink-0">
          <Button onClick={close} size="lg">
            Take me in
          </Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-ink-3 mb-1">{label}</div>
      <div className="text-[15px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}
