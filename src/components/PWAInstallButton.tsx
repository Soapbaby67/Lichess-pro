import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';

export function PWAInstallModalButton({
  onLogAction,
}: {
  onLogAction?: (label: string) => void;
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running standalone on home screen
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#2A2A2E] text-xs font-mono text-[#10B981]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
        Установлено
      </span>
    );
  }

  const handleInstallClick = async () => {
    onLogAction?.('Нажата кнопка установки приложения');
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-xs font-semibold text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
      >
        <svg className="w-3.5 h-3.5 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Установить на телефон</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#1E1E1E] border border-[#2A2A2E] p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <h3 className="text-base font-bold text-[#F3F4F6]">
                  Установка на телефон (PWA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6]"
              >
                ✕ Закрыть
              </button>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Приложение работает как официальное Progressive Web App (PWA) с полноэкранным режимом, офлайн-кэшем и тактильной отдачей без App Store/Google Play:
            </p>

            <div className="space-y-3 text-xs">
              {/* Android Guide */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2E] space-y-1">
                <div className="font-semibold text-[#10B981]">Для Android (Chrome / Яндекс):</div>
                <ol className="list-decimal list-inside text-[#D1D5DB] space-y-0.5">
                  <li>Нажмите меню <strong>«⋮»</strong> (три точки) в правом верхнем углу браузера.</li>
                  <li>Выберите <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.</li>
                  <li>Иконка появится на рабочем столе как нативное приложение.</li>
                </ol>
              </div>

              {/* iOS Guide */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2E] space-y-1">
                <div className="font-semibold text-[#D97706]">Для iPhone / iPad (Safari):</div>
                <ol className="list-decimal list-inside text-[#D1D5DB] space-y-0.5">
                  <li>Откройте эту ссылку в браузере <strong>Safari</strong>.</li>
                  <li>Нажмите значок <strong>«Поделиться»</strong> (квадрат со стрелкой вверх внизу экрана).</li>
                  <li>Пролистайте вниз и выберите <strong>«На экран "Домой"»</strong>.</li>
                </ol>
              </div>

              {/* Flutter Native Guide */}
              <div className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2E] space-y-1">
                <div className="font-semibold text-[#60A5FA]">Для сборки APK через Flutter:</div>
                <p className="text-[#9CA3AF]">
                  Код в разделе <strong>«Flutter Код»</strong> можно собрать в нативный APK командой <code className="text-[#F3F4F6]">flutter build apk --release</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-[#121212] font-bold text-xs transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
}
