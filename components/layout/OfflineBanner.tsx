import * as React from 'react';
import { WifiOff, RefreshCcw, Cloud } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  queueLength: number;
  lastSyncedAt: number | null;
  onRetry?: () => void;
}

function formatTimestamp(timestamp: number | null): string | null {
  if (!timestamp) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  } catch (error) {
    console.warn('[OfflineBanner] Timestamp format failed', error);
    return null;
  }
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline, queueLength, lastSyncedAt, onRetry }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setIsCollapsed(false);
    }
  }, [isOnline]);

  const lastSyncTime = formatTimestamp(lastSyncedAt);
  const showBanner = !isOnline || queueLength > 0;

  if (!showBanner) {
    return null;
  }

  return (
    <section
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${
        isCollapsed ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      <div
        className={`mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-4 pt-5 md:pt-6`}
      >
        <div
          className={`relative overflow-hidden rounded-2xl border shadow-lg backdrop-blur-xl px-5 py-4 md:px-6 md:py-5 transition-colors ${
            isOnline ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-slate-900/80 border-slate-700 text-slate-100'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="absolute right-3 top-3 rounded-full bg-black/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 hover:bg-black/20"
          >
            Kapat
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-start gap-3">
              <span
                className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isOnline ? 'bg-emerald-600/20 text-emerald-700' : 'bg-slate-700 text-white'
                }`}
              >
                {isOnline ? <Cloud className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </span>
              <div className="space-y-1">
                <p className={`text-sm font-semibold uppercase tracking-wide ${isOnline ? 'text-emerald-900' : 'text-slate-100'}`}>
                  {isOnline ? 'Çevrimiçi - Bekleyen senkronizasyonlar var' : 'Çevrimdışı modda çalışıyorsunuz'}
                </p>
                <p
                  className={`text-sm leading-relaxed sm:text-base ${
                    isOnline ? 'text-emerald-900/80' : 'text-slate-200'
                  }`}
                >
                  {!isOnline
                    ? 'Bağlantınız kesildi. Form gönderimleri ve kritik aksiyonlar kuyruğa alınarak bağlantı sağlandığında otomatik senkronize edilecektir.'
                    : 'Bağlantı geldi. Bekleyen veriler arka planda senkronize ediliyor.'}
                </p>
                {queueLength > 0 ? (
                  <p className={`text-xs sm:text-sm ${isOnline ? 'text-emerald-800/80' : 'text-slate-300'}`}>
                    {queueLength} adet gönderim bekliyor
                    {lastSyncTime ? ` • Son senkronizasyon ${lastSyncTime}` : ''}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isOnline
                      ? 'bg-white/80 text-emerald-700 hover:bg-white'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 focus-visible:ring-emerald-200'
                  }`}
                >
                  <RefreshCcw className="h-4 w-4" /> Yeniden Dene
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OfflineBanner;
