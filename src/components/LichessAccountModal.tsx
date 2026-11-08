import React, { useState } from 'react';
import {
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Swords,
  UserCheck,
  X,
} from 'lucide-react';
import { LichessAccountProfile, LICHESS_TOKEN_CREATE_URL } from '../logic/lichessApiClient';

interface LichessAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  account: LichessAccountProfile | null;
  gamesLoadedCount: number;
  isSyncing: boolean;
  syncError: string | null;
  onConnectToken: (token: string, maxGames: number) => Promise<void>;
  onSyncByUsernameOnly: (username: string, maxGames: number) => Promise<void>;
  onRefreshAccountGames: (maxGames: number) => Promise<void>;
  onDisconnect: () => void;
}

export const LichessAccountModal: React.FC<LichessAccountModalProps> = ({
  isOpen,
  onClose,
  token,
  account,
  gamesLoadedCount,
  isSyncing,
  syncError,
  onConnectToken,
  onSyncByUsernameOnly,
  onRefreshAccountGames,
  onDisconnect,
}) => {
  const [inputToken, setInputToken] = useState(token);
  const [quickUsername, setQuickUsername] = useState('');
  const [maxGames, setMaxGames] = useState<number>(35);

  if (!isOpen) return null;

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    await onConnectToken(inputToken.trim(), maxGames);
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUsername.trim()) return;
    await onSyncByUsernameOnly(quickUsername.trim(), maxGames);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-[#2A2A2A] bg-[#161616] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626] bg-[#1A1A1A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D97706]/15 border border-[#D97706]/40 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5]">
                Подключение аккаунта Lichess.org (API v2)
              </h2>
              <p className="text-[11px] text-[#9E9E9E]">
                Реальная синхронизация партий, рейтингов и запуск живых игр через Board API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E9E9E] hover:text-white hover:bg-[#262626] transition-colors"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Connected Account Status */}
          {account && (
            <div className="rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      {account.title && (
                        <span className="text-xs font-bold text-[#F59E0B]">{account.title}</span>
                      )}
                      <span className="text-sm font-bold text-white">{account.username}</span>
                      <span className="text-[11px] text-[#10B981] font-mono">
                        • Подключен к lichess.org
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A3A3A3]">
                      Загружено в аналитическое ядро: <strong className="text-white tabular-nums">{gamesLoadedCount}</strong> партий • Всего на аккаунте: <strong className="text-white tabular-nums">{account.count?.all ?? gamesLoadedCount}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRefreshAccountGames(maxGames)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-xs font-semibold text-[#E5E5E5] border border-[#333333] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#F59E0B]' : ''}`} />
                    Обновить
                  </button>
                  <button
                    onClick={onDisconnect}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-xs font-semibold text-[#F87171] border border-[#EF4444]/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Выйти
                  </button>
                </div>
              </div>

              {/* Ratings strip */}
              <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#10B981]/20">
                <div className="bg-[#121212]/90 rounded-lg p-2 text-center border border-[#262626]">
                  <div className="text-[10px] text-[#9E9E9E] uppercase">Bullet</div>
                  <div className="text-xs font-mono font-bold text-white tabular-nums">
                    {account.perfs.bullet?.rating ?? '—'}
                  </div>
                </div>
                <div className="bg-[#121212]/90 rounded-lg p-2 text-center border border-[#262626]">
                  <div className="text-[10px] text-[#9E9E9E] uppercase">Blitz</div>
                  <div className="text-xs font-mono font-bold text-[#F59E0B] tabular-nums">
                    {account.perfs.blitz?.rating ?? '—'}
                  </div>
                </div>
                <div className="bg-[#121212]/90 rounded-lg p-2 text-center border border-[#262626]">
                  <div className="text-[10px] text-[#9E9E9E] uppercase">Rapid</div>
                  <div className="text-xs font-mono font-bold text-[#10B981] tabular-nums">
                    {account.perfs.rapid?.rating ?? '—'}
                  </div>
                </div>
                <div className="bg-[#121212]/90 rounded-lg p-2 text-center border border-[#262626]">
                  <div className="text-[10px] text-[#9E9E9E] uppercase">Classical</div>
                  <div className="text-xs font-mono font-bold text-white tabular-nums">
                    {account.perfs.classical?.rating ?? '—'}
                  </div>
                </div>
                <div className="bg-[#121212]/90 rounded-lg p-2 text-center border border-[#262626]">
                  <div className="text-[10px] text-[#9E9E9E] uppercase">Puzzles</div>
                  <div className="text-xs font-mono font-bold text-[#38BDF8] tabular-nums">
                    {account.perfs.puzzle?.rating ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {syncError && (
            <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 p-3 flex items-start gap-2.5 text-xs text-[#FCA5A5]">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div>{syncError}</div>
            </div>
          )}

          {/* Full Token Auth Form */}
          <form onSubmit={handleTokenSubmit} className="space-y-3 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Полный вход через персональный токен Lichess API
                </span>
              </div>
              <a
                href={LICHESS_TOKEN_CREATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F59E0B] hover:text-[#FBBF24] underline underline-offset-2"
              >
                Создать токен в 1 клик на Lichess.org
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-[#A3A3A3] leading-relaxed">
              Нажмите <strong className="text-[#E5E5E5]">«Создать токен в 1 клик»</strong> — откроется официальная страница Lichess с уже включенными правами (<code className="text-[#F59E0B]">board:play</code>, <code className="text-[#F59E0B]">challenge:write</code>, <code className="text-[#F59E0B]">preference:read</code>). Нажмите внизу страницы Lichess <strong>Create</strong> и вставьте полученный код <code className="text-[#10B981]">lip_...</code> ниже:
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Вставьте ваш токен lip_..."
                className="flex-1 rounded-lg bg-[#121212] border border-[#333333] px-3.5 py-2 text-xs font-mono text-white placeholder-[#666666] focus:outline-none focus:border-[#D97706]"
              />
              <select
                value={maxGames}
                onChange={(e) => setMaxGames(Number(e.target.value))}
                className="rounded-lg bg-[#121212] border border-[#333333] px-3 py-2 text-xs text-[#E5E5E5] focus:outline-none focus:border-[#D97706]"
                title="Количество загружаемых партий"
              >
                <option value={20}>20 партий</option>
                <option value={35}>35 партий</option>
                <option value={50}>50 партий</option>
                <option value={80}>80 партий</option>
              </select>
              <button
                type="submit"
                disabled={isSyncing || !inputToken.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <Swords className="w-3.5 h-3.5" />
                    Войти и загрузить
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Optional Quick Username Inspection */}
          <form onSubmit={handleUsernameSubmit} className="space-y-2.5 bg-[#191919] border border-[#262626] rounded-xl p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#10B981]" />
              <span className="text-xs font-bold text-[#E5E5E5]">
                Быстрый анализ любого игрока Lichess по нику (без токена)
              </span>
            </div>
            <p className="text-[11px] text-[#9E9E9E]">
              Хотите прямо сейчас проверить расширенную статистику на своем аккаунте или аккаунте гроссмейстера (например, <code className="text-[#E5E5E5]">DrNykterstein</code>)? Введите ник Lichess:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickUsername}
                onChange={(e) => setQuickUsername(e.target.value)}
                placeholder="Ник на Lichess (например, ваш логин)"
                className="flex-1 rounded-lg bg-[#121212] border border-[#333333] px-3.5 py-2 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#10B981]"
              />
              <button
                type="submit"
                disabled={isSyncing || !quickUsername.trim()}
                className="px-3.5 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                Загрузить статистику
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
