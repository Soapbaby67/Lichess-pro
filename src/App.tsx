import React, { useState, useEffect } from 'react';
import {
  BoardThemeId,
  PieceSetId,
  OpeningStatDto,
  PersonalPuzzleDto,
  RealPlayedGameSummaryDto,
  PERSONAL_MISTAKE_PUZZLES,
} from './logic/chessAnalytics';
import {
  LichessAccountProfile,
  RealLichessAnalyticsBundle,
  fetchLichessAccount,
  fetchLichessUserGamesAnalytics,
} from './logic/lichessApiClient';
import { AdvancedStatsView } from './components/AdvancedStatsView';
import { AnalysisAndBoardView } from './components/AnalysisAndBoardView';
import { PuzzleTrainerView } from './components/PuzzleTrainerView';
import { FlutterArchitectureView } from './components/FlutterArchitectureView';
import { PWAInstallModalButton } from './components/PWAInstallButton';
import { LichessAccountModal } from './components/LichessAccountModal';
import { HapticEventLog, triggerFlutterHaptic } from './utils/haptics';

type AppTab = 'stats' | 'analysis' | 'puzzles' | 'flutter';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('stats');

  // Persistent Board & Piece visual preferences
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>(() => {
    return (localStorage.getItem('lichess_pro_board_theme') as BoardThemeId) || 'oled_minimalist';
  });
  const [pieceSet, setPieceSet] = useState<PieceSetId>(() => {
    return (localStorage.getItem('lichess_pro_piece_set') as PieceSetId) || 'neo_staunton';
  });

  // Lichess API Auth & Real Data State
  const [lichessToken, setLichessToken] = useState<string>(() => {
    return localStorage.getItem('lichess_pro_api_token') || '';
  });
  const [accountProfile, setAccountProfile] = useState<LichessAccountProfile | null>(null);
  const [realAnalytics, setRealAnalytics] = useState<RealLichessAnalyticsBundle | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSyncingLichess, setIsSyncingLichess] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [boardFenOverride, setBoardFenOverride] = useState<{
    fen: string;
    label: string;
    evalCp: number;
  } | null>(null);
  const [selectedRealGame, setSelectedRealGame] = useState<RealPlayedGameSummaryDto | null>(
    null
  );
  const [selectedPuzzle, setSelectedPuzzle] = useState<PersonalPuzzleDto | null>(
    PERSONAL_MISTAKE_PUZZLES[0]
  );
  const [hapticLogs, setHapticLogs] = useState<HapticEventLog[]>([
    {
      id: 'init-1',
      timestamp: '22:55:01',
      method: 'HapticFeedback.selectionClick()',
      reasonRu: 'Инициализация модуля статистики Riverpod + Lichess API',
    },
  ]);

  const handleLogHaptic = (entry: HapticEventLog) => {
    setHapticLogs((prev) => [entry, ...prev.slice(0, 14)]);
  };

  const handleChangeBoardTheme = (theme: BoardThemeId) => {
    setBoardTheme(theme);
    localStorage.setItem('lichess_pro_board_theme', theme);
  };

  const handleChangePieceSet = (ps: PieceSetId) => {
    setPieceSet(ps);
    localStorage.setItem('lichess_pro_piece_set', ps);
  };

  const handleConnectToken = async (rawToken: string, maxGames: number = 35) => {
    setIsSyncingLichess(true);
    setSyncError(null);
    try {
      const profile = await fetchLichessAccount(rawToken);
      setAccountProfile(profile);
      setLichessToken(rawToken);
      localStorage.setItem('lichess_pro_api_token', rawToken);

      const bundle = await fetchLichessUserGamesAnalytics(
        profile.username,
        rawToken,
        maxGames
      );
      setRealAnalytics(bundle);
      triggerFlutterHaptic(
        'HapticFeedback.lightImpact()',
        `Синхронизирован аккаунт Lichess: ${profile.username} (${bundle.totalAnalyzedGames} парт.)`,
        handleLogHaptic
      );
      setIsAccountModalOpen(false);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Ошибка подключения к Lichess API'
      );
    } finally {
      setIsSyncingLichess(false);
    }
  };

  const handleSyncByUsernameOnly = async (username: string, maxGames: number = 35) => {
    setIsSyncingLichess(true);
    setSyncError(null);
    try {
      const bundle = await fetchLichessUserGamesAnalytics(
        username,
        lichessToken || undefined,
        maxGames
      );
      setRealAnalytics(bundle);
      triggerFlutterHaptic(
        'HapticFeedback.lightImpact()',
        `Загружена статистика игрока Lichess: ${bundle.username} (${bundle.totalAnalyzedGames} парт.)`,
        handleLogHaptic
      );
      setIsAccountModalOpen(false);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Ошибка загрузки партий игрока Lichess'
      );
    } finally {
      setIsSyncingLichess(false);
    }
  };

  const handleRefreshAccountGames = async (maxGames: number = 35) => {
    const targetUsername = accountProfile?.username || realAnalytics?.username;
    if (!targetUsername) return;
    setIsSyncingLichess(true);
    setSyncError(null);
    try {
      const bundle = await fetchLichessUserGamesAnalytics(
        targetUsername,
        lichessToken || undefined,
        maxGames
      );
      setRealAnalytics(bundle);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Не удалось обновить партии с Lichess'
      );
    } finally {
      setIsSyncingLichess(false);
    }
  };

  const handleDisconnectLichess = () => {
    localStorage.removeItem('lichess_pro_api_token');
    setLichessToken('');
    setAccountProfile(null);
    setRealAnalytics(null);
    setSyncError(null);
  };

  // Auto-restore token session if saved in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lichess_pro_api_token');
    if (saved && saved.trim().length > 5) {
      handleConnectToken(saved.trim(), 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInspectOpeningOnBoard = (opening: OpeningStatDto) => {
    setSelectedRealGame(null);
    setBoardFenOverride({
      fen: opening.sampleFen,
      label: `${opening.eco} · ${opening.nameRu} (${opening.variationRu})`,
      evalCp: opening.evalCpAfterMistake,
    });
    setActiveTab('analysis');
  };

  const handleInspectRealGameOnBoard = (game: RealPlayedGameSummaryDto) => {
    setBoardFenOverride(null);
    setSelectedRealGame(game);
    setActiveTab('analysis');
  };

  const handleStartPersonalPuzzle = (puzzle: PersonalPuzzleDto) => {
    setSelectedPuzzle(puzzle);
    setActiveTab('puzzles');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F3F4F6] flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="flex items-center justify-between gap-6 px-6 py-3.5 border-b border-[#262629] bg-[#121212]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('stats');
          }}
          className="text-lg font-bold tracking-tight text-[#F3F4F6] whitespace-nowrap shrink-0"
        >
          Lichess Mobile Pro
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9CA3AF]"
        >
          <button
            type="button"
            onClick={() => {
              triggerFlutterHaptic('HapticFeedback.selectionClick()', 'Раздел: Статистика', handleLogHaptic);
              setActiveTab('stats');
            }}
            className={`hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'stats'
                ? 'text-[#F3F4F6] underline decoration-[#D97706] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Статистика
          </button>

          <button
            type="button"
            onClick={() => {
              triggerFlutterHaptic('HapticFeedback.selectionClick()', 'Раздел: Анализ и Доска', handleLogHaptic);
              setActiveTab('analysis');
            }}
            className={`hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'analysis'
                ? 'text-[#F3F4F6] underline decoration-[#D97706] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Анализ и Доска
          </button>

          <button
            type="button"
            onClick={() => {
              triggerFlutterHaptic('HapticFeedback.selectionClick()', 'Раздел: Пазл-тренажер', handleLogHaptic);
              setActiveTab('puzzles');
            }}
            className={`hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'puzzles'
                ? 'text-[#F3F4F6] underline decoration-[#D97706] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            Пазл-тренажер
          </button>

          <button
            type="button"
            onClick={() => {
              triggerFlutterHaptic('HapticFeedback.selectionClick()', 'Раздел: Flutter Код', handleLogHaptic);
              setActiveTab('flutter');
            }}
            className={`hover:text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'flutter'
                ? 'text-[#F3F4F6] underline decoration-[#D97706] decoration-2 underline-offset-8'
                : ''
            }`}
          >
            APK и Код
          </button>
        </nav>

        {/* Zone 3: Lichess Account Auth + PWA Install */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallModalButton
            onLogAction={(lbl) =>
              triggerFlutterHaptic('HapticFeedback.selectionClick()', lbl, handleLogHaptic)
            }
          />
          <button
            type="button"
            onClick={() => {
              triggerFlutterHaptic(
                'HapticFeedback.mediumImpact()',
                'Открытие окна авторизации Lichess API',
                handleLogHaptic
              );
              setIsAccountModalOpen(true);
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              accountProfile || realAnalytics
                ? 'bg-[#10B981] text-[#121212] hover:bg-[#059669]'
                : 'bg-[#D97706] text-[#121212] hover:bg-[#B45309]'
            }`}
          >
            {accountProfile
              ? `Lichess: ${accountProfile.username}`
              : realAnalytics
                ? `Lichess: ${realAnalytics.username}`
                : 'Войти через Lichess API'}
          </button>
        </div>
      </header>

      {/* Mobile Viewport Navigation Strip (visible only below md) */}
      <div className="md:hidden grid grid-cols-4 gap-1 px-3 py-2 bg-[#18181B] border-b border-[#262629]">
        {(
          [
            { id: 'stats', label: 'Статистика' },
            { id: 'analysis', label: 'Доска QoL' },
            { id: 'puzzles', label: 'Тренажер' },
            { id: 'flutter', label: 'APK и Код' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-1.5 px-2 rounded text-xs font-semibold text-center whitespace-nowrap truncate ${
              activeTab === tab.id
                ? 'bg-[#D97706] text-[#121212]'
                : 'text-[#9CA3AF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'stats' && (
          <AdvancedStatsView
            realAnalytics={realAnalytics}
            accountProfile={accountProfile}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onInspectOpeningOnBoard={handleInspectOpeningOnBoard}
            onInspectRealGameOnBoard={handleInspectRealGameOnBoard}
            onStartPersonalPuzzle={handleStartPersonalPuzzle}
            onLogHaptic={handleLogHaptic}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisAndBoardView
            externalFenOverride={boardFenOverride}
            onClearExternalFen={() => setBoardFenOverride(null)}
            externalRealGame={selectedRealGame}
            onClearExternalRealGame={() => setSelectedRealGame(null)}
            boardTheme={boardTheme}
            onChangeBoardTheme={handleChangeBoardTheme}
            pieceSet={pieceSet}
            onChangePieceSet={handleChangePieceSet}
            lichessToken={lichessToken}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            hapticLogs={hapticLogs}
            onLogHaptic={handleLogHaptic}
          />
        )}

        {activeTab === 'puzzles' && (
          <PuzzleTrainerView
            initialPuzzle={selectedPuzzle}
            puzzlesList={realAnalytics?.generatedPuzzles}
            boardTheme={boardTheme}
            pieceSet={pieceSet}
            onLogHaptic={handleLogHaptic}
          />
        )}

        {activeTab === 'flutter' && (
          <FlutterArchitectureView onLogHaptic={handleLogHaptic} />
        )}
      </main>

      {/* Lichess Account & Token Modal */}
      <LichessAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        token={lichessToken}
        account={accountProfile}
        gamesLoadedCount={realAnalytics?.totalAnalyzedGames ?? 0}
        isSyncing={isSyncingLichess}
        syncError={syncError}
        onConnectToken={handleConnectToken}
        onSyncByUsernameOnly={handleSyncByUsernameOnly}
        onRefreshAccountGames={handleRefreshAccountGames}
        onDisconnect={handleDisconnectLichess}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-[#262629] px-6 py-4 text-xs text-[#9CA3AF] flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <span>
          Lichess Mobile Architecture (<code className="font-mono">lichess-org/mobile</code>) · True Dark OLED <code className="font-mono">#121212</code> &amp; <code className="font-mono">#1E1E1E</code>
        </span>
        <span>
          Lichess API v2 · Riverpod · fl_chart · chessground · Stockfish 16.1 NNUE
        </span>
      </footer>
    </div>
  );
}
