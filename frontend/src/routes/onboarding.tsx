import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardSection } from '../components/ui/Card';
import { getCurrentSubscription, getPushSupport, subscribeToPush } from '../lib/push';

export function Onboarding() {
  const navigate = useNavigate();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getPushSupport();
      setSupported(s);
      if (s) {
        setPermission(Notification.permission);
        const sub = await getCurrentSubscription();
        setSubscribed(!!sub);
      }
    })();
  }, []);

  const enable = async () => {
    setBusy(true);
    setErr(null);
    try {
      await subscribeToPush();
      setSubscribed(true);
      setPermission('granted');
    } catch (e: any) {
      setErr(e?.message === 'permission_denied' ? 'Notifications were blocked.' : 'Could not enable notifications.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto max-w-xl px-5 py-12">
        <div className="text-center mb-10 fadein">
          <div className="font-display text-[28px] font-semibold text-ink">You're in.</div>
          <p className="text-ink-2 mt-1">Two small things to make the app feel right.</p>
        </div>

        <Card className="mb-4">
          <CardSection>
            <div className="text-[13px] uppercase tracking-widest text-ink-3 mb-1">Step 1</div>
            <h2 className="font-display text-[20px] font-semibold text-ink">Install to your home screen</h2>
            <p className="text-sm text-ink-2 mt-2 leading-relaxed">
              On iPhone, tap the share icon in Safari, then <span className="font-medium text-ink">Add to Home Screen</span>.
              On Android, your browser will show an <span className="font-medium text-ink">Install</span> option in the menu.
              You'll get a clean icon and full-screen app, plus reliable notifications.
            </p>
          </CardSection>
        </Card>

        <Card className="mb-8">
          <CardSection>
            <div className="text-[13px] uppercase tracking-widest text-ink-3 mb-1">Step 2</div>
            <h2 className="font-display text-[20px] font-semibold text-ink">Turn on reminders</h2>
            <p className="text-sm text-ink-2 mt-2 leading-relaxed">
              Optional, but the easiest way to remember the evening routine. You can change this anytime.
            </p>
            <div className="mt-4 flex gap-2 items-center">
              {!supported && <span className="text-sm text-ink-2">Notifications aren't supported in this browser.</span>}
              {supported && subscribed && permission === 'granted' && (
                <span className="text-sm text-sage">Notifications enabled.</span>
              )}
              {supported && !subscribed && (
                <Button onClick={enable} disabled={busy}>
                  {busy ? 'Enabling…' : 'Enable notifications'}
                </Button>
              )}
            </div>
            {err && <p className="mt-2 text-sm text-danger">{err}</p>}
          </CardSection>
        </Card>

        <div className="text-center">
          <Button variant="secondary" size="lg" onClick={() => navigate('/today')}>
            Take me to today
          </Button>
        </div>
      </div>
    </div>
  );
}
