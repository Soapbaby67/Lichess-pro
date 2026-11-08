import React, { useState } from 'react';
import {
  OpeningStatDto,
  PersonalPuzzleDto,
  PERSONAL_MISTAKE_PUZZLES,
} from './logic/chessAnalytics';
import { AdvancedStatsView } from './components/AdvancedStatsView';
import { AnalysisAndBoardView } from './components/AnalysisAndBoardView';
import { PuzzleTrainerView } from './components/PuzzleTrainerView';
import { FlutterArchitectureView } from './components/FlutterArchitectureView';
import { PWAInstallModalButton } from './components/PWAInstallButton';
import { HapticEventLog, triggerFlutterHaptic } from './utils/haptics';

type AppTab = 'stats' | 'analysis' | 'puzzles' | 'flutter';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('stats');
  const [boardFenOverride, setBoardFenOverride] = useState<{
    fen: string;
    label: string;
    evalCp: number;
  } | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PersonalPuzzleDto | null>(
    PERSONAL_MISTAKE_PUZZLES[0]
  );
  const [hapticLogs, setHapticLogs] = useState<HapticEventLog[]>([
    {
      id: 'init-1',
      timestamp: '22:55:01',
      method: 'HapticFeedback.selectionClick()',
      reasonRu: 'Инициализация модуля статистики Riverpod',
    },
  ]);

  const handleLogHaptic = (entry: HapticEventLog) => {
    setHapticLogs((prev) => [entry, ...prev.slice(0, 14)]);
  };

  const handleInspectOpeningOnBoard = (opening: OpeningStatDto) => {
    setBoardFenOverride({
      fen: opening.sampleFen,
      label: `${opening.eco} · ${opening.nameRu} (${opening.variationRu})`,
      evalCp: opening.evalCpAfterMistake,
    });
    setActiveTab('analysis');
  };

  const handleStartPersonalPuzzle = (puzzle: PersonalPuzzleDto) => {
    setSelectedPuzzle(puzzle);
    setActiveTab('puzzles');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F3F4F6] flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-[#262629] bg-[#121212]">
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
            Flutter Код
          </button>
        </nav>

        {/* Zone 3: 1 primary action + PWA Install */}
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
                'Быстрый переход к решению персональных зевков',
                handleLogHaptic
              );
              setActiveTab(activeTab === 'puzzles' ? 'analysis' : 'puzzles');
            }}
            className="px-4 py-2 text-xs font-semibold text-[#121212] bg-[#D97706] rounded-lg hover:bg-[#B45309] transition-colors whitespace-nowrap shrink-0"
          >
            {activeTab === 'puzzles' ? 'Открыть доску анализа' : 'Тренировать мои ошибки'}
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
            { id: 'flutter', label: 'Dart Код' },
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
            onInspectOpeningOnBoard={handleInspectOpeningOnBoard}
            onStartPersonalPuzzle={handleStartPersonalPuzzle}
            onLogHaptic={handleLogHaptic}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisAndBoardView
            externalFenOverride={boardFenOverride}
            onClearExternalFen={() => setBoardFenOverride(null)}
            hapticLogs={hapticLogs}
            onLogHaptic={handleLogHaptic}
          />
        )}

        {activeTab === 'puzzles' && (
          <PuzzleTrainerView
            initialPuzzle={selectedPuzzle}
            onLogHaptic={handleLogHaptic}
          />
        )}

        {activeTab === 'flutter' && (
          <FlutterArchitectureView onLogHaptic={handleLogHaptic} />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#262629] px-6 py-4 text-xs text-[#9CA3AF] flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <span>
          Lichess Mobile Architecture (<code className="font-mono">lichess-org/mobile</code>) · True Dark OLED <code className="font-mono">#121212</code> &amp; <code className="font-mono">#1E1E1E</code>
        </span>
        <span>
          Riverpod · fl_chart · chessground · Stockfish 16.1 NNUE
        </span>
      </footer>
    </div>
  );
}
