import React, { useState, useEffect } from 'react';
import {
  BoardThemeId,
  PieceSetId,
  PersonalPuzzleDto,
  PERSONAL_MISTAKE_PUZZLES,
  applyUciMoveToFen,
} from '../logic/chessAnalytics';
import { InteractiveChessboard } from './InteractiveChessboard';
import { triggerFlutterHaptic, HapticEventLog } from '../utils/haptics';

interface PuzzleTrainerViewProps {
  initialPuzzle?: PersonalPuzzleDto | null;
  puzzlesList?: PersonalPuzzleDto[];
  boardTheme?: BoardThemeId;
  pieceSet?: PieceSetId;
  onLogHaptic: (entry: HapticEventLog) => void;
}

export function PuzzleTrainerView({
  initialPuzzle,
  puzzlesList,
  boardTheme = 'oled_minimalist',
  pieceSet = 'neo_staunton',
  onLogHaptic,
}: PuzzleTrainerViewProps) {
  const effectivePuzzles =
    puzzlesList && puzzlesList.length > 0 ? puzzlesList : PERSONAL_MISTAKE_PUZZLES;

  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    if (!initialPuzzle) return 0;
    const found = effectivePuzzles.findIndex((p) => p.id === initialPuzzle.id);
    return found >= 0 ? found : 0;
  });

  const [autoNext15s, setAutoNext15s] = useState<boolean>(true);
  const [status, setStatus] = useState<'idle' | 'solved' | 'failed'>('idle');
  const [boardFen, setBoardFen] = useState<string>(
    effectivePuzzles[0].initialFen
  );
  const [solvedCount, setSolvedCount] = useState<number>(14);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);

  const puzzle = effectivePuzzles[currentIdx] || effectivePuzzles[0];

  useEffect(() => {
    if (initialPuzzle) {
      const idx = effectivePuzzles.findIndex((p) => p.id === initialPuzzle.id);
      if (idx >= 0) {
        setCurrentIdx(idx);
        setBoardFen(effectivePuzzles[idx].initialFen);
        setStatus('idle');
        setCountdownMs(null);
      }
    }
  }, [initialPuzzle, effectivePuzzles]);

  useEffect(() => {
    if (status !== 'solved' || !autoNext15s) {
      setCountdownMs(null);
      return;
    }

    setCountdownMs(1500);
    const interval = setInterval(() => {
      setCountdownMs((prev) => {
        if (prev === null) return null;
        if (prev <= 150) {
          clearInterval(interval);
          return 0;
        }
        return prev - 150;
      });
    }, 150);

    const timer = setTimeout(() => {
      const nextIdx = (currentIdx + 1) % effectivePuzzles.length;
      setCurrentIdx(nextIdx);
      setBoardFen(effectivePuzzles[nextIdx].initialFen);
      setStatus('idle');
      setCountdownMs(null);
      triggerFlutterHaptic(
        'HapticFeedback.selectionClick()',
        'Автопереход 1.5с к следующей задаче',
        onLogHaptic
      );
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [status, autoNext15s, currentIdx, effectivePuzzles, onLogHaptic]);

  const selectPuzzleByIndex = (idx: number) => {
    const target = effectivePuzzles[idx];
    if (!target) return;
    setCurrentIdx(idx);
    setBoardFen(target.initialFen);
    setStatus('idle');
    setCountdownMs(null);
    triggerFlutterHaptic(
      'HapticFeedback.selectionClick()',
      `Выбрана задача: ${target.motifLabelRu}`,
      onLogHaptic
    );
  };

  const handleAttemptMove = (uci: string) => {
    const res = applyUciMoveToFen(puzzle.initialFen, uci);
    setBoardFen(res.nextFen);

    if (uci === puzzle.solutionUci) {
      setStatus('solved');
      setSolvedCount((c) => c + 1);
      triggerFlutterHaptic(
        'HapticFeedback.lightImpact()',
        `Верное решение задачи: ${puzzle.solutionSan}`,
        onLogHaptic
      );
    } else {
      setStatus('failed');
      triggerFlutterHaptic(
        'HapticFeedback.heavyImpact()',
        `Неверный ход (${uci}) — требуется рестарт`,
        onLogHaptic
      );
    }
  };

  const handleInstantRestart = () => {
    setBoardFen(puzzle.initialFen);
    setStatus('idle');
    setCountdownMs(null);
    triggerFlutterHaptic(
      'HapticFeedback.selectionClick()',
      'Моментальный рестарт задачи после ошибки',
      onLogHaptic
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262629]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6]">
            03. Пазл-тренажер «Мои частые ошибки» (QoL Trainer)
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Персональные тактические задачи из ваших партий · Автопереход через 1.5 сек · Моментальный рестарт при ошибке
          </p>
        </div>

        {/* Auto-next 1.5s toggle */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] self-start">
          <input
            id="auto-next-toggle"
            type="checkbox"
            checked={autoNext15s}
            onChange={(e) => {
              triggerFlutterHaptic(
                'HapticFeedback.selectionClick()',
                `Автопереход 1.5с: ${e.target.checked ? 'ВКЛ' : 'ВЫКЛ'}`,
                onLogHaptic
              );
              setAutoNext15s(e.target.checked);
            }}
            className="w-4 h-4 accent-[#10B981] rounded cursor-pointer"
          />
          <label
            htmlFor="auto-next-toggle"
            className="text-xs font-semibold text-[#F3F4F6] cursor-pointer select-none whitespace-nowrap"
          >
            Автопереход через 1.5 сек после решения
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Puzzle Chessboard */}
        <div className="lg:col-span-6 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col items-center space-y-4">
          <div className="w-full flex items-center justify-between gap-2 text-xs text-[#9CA3AF]">
            <span className="truncate">
              Партия против <strong className="text-[#F3F4F6]">{puzzle.gameOpponent} ({puzzle.gameRating})</strong> · {puzzle.datePlayed}
            </span>
            <span className="font-mono font-bold text-[#10B981] whitespace-nowrap shrink-0">
              Решено сегодня: {solvedCount}
            </span>
          </div>

          <InteractiveChessboard
            fen={boardFen}
            themeId={boardTheme}
            pieceSetId={pieceSet}
            legalDotOpacity={0.65}
            lastMoveFrom={puzzle.fromSquare}
            lastMoveTo={status === 'solved' ? puzzle.toSquare : undefined}
            onMakeUciMove={(uci) => handleAttemptMove(uci)}
          />

          <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2A2A2E]">
            <button
              type="button"
              onClick={() => handleAttemptMove(puzzle.solutionUci)}
              className="px-3.5 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#121212] font-bold text-xs transition-colors whitespace-nowrap"
            >
              Выполнить лучший ход ({puzzle.solutionSan})
            </button>

            <button
              type="button"
              onClick={() => handleAttemptMove('a2a3')}
              className="px-3.5 py-2 rounded-lg bg-[#121212] hover:bg-[#27272A] border border-[#2E2E32] text-[#FCA5A5] font-semibold text-xs transition-colors whitespace-nowrap"
            >
              Симулировать ошибку ({puzzle.blunderMovePlayedSan})
            </button>

            {status === 'failed' && (
              <button
                type="button"
                onClick={handleInstantRestart}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs transition-colors whitespace-nowrap"
              >
                Моментальный рестарт ↺
              </button>
            )}
          </div>
        </div>

        {/* Right: Puzzle Status, Explanation & Queue */}
        <div className="lg:col-span-6 space-y-5">
          {/* Status Card */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#D97706]">
                ECO {puzzle.eco} · Паттерн: {puzzle.motifLabelRu}
              </span>
              <span className="text-xs font-mono text-[#9CA3AF]">
                Оценка: {puzzle.evalBefore} → {puzzle.evalAfter}
              </span>
            </div>

            <h2 className="text-lg font-bold text-[#F3F4F6]">
              Найдите тактический удар вместо хода {puzzle.blunderMovePlayedSan}
            </h2>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Кликните на фигуру на поле <strong className="text-[#F3F4F6] font-mono">{puzzle.fromSquare}</strong> и походите на{' '}
              <strong className="text-[#F3F4F6] font-mono">{puzzle.toSquare}</strong> (или нажмите кнопку проверки под доской).
            </p>

            {status === 'solved' && (
              <div className="p-4 rounded-xl bg-[#064E3B]/50 border border-[#10B981] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#6EE7B7]">
                    Верно! Найден ход {puzzle.solutionSan}
                  </span>
                  {autoNext15s && countdownMs !== null && (
                    <span className="text-xs font-mono text-[#FDE68A]">
                      След. задача через {(countdownMs / 1000).toFixed(1)}с...
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#E5E7EB] leading-relaxed">
                  {puzzle.explanationRu}
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="p-4 rounded-xl bg-[#451A1A] border border-[#EF4444] flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#FCA5A5]">
                    Неверный ход — упущен тактический ресурс
                  </div>
                  <div className="text-xs text-[#E5E7EB]">
                    Нажмите «Моментальный рестарт», чтобы мгновенно вернуть исходную позицию без перезагрузки экрана.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleInstantRestart}
                  className="px-3.5 py-2 rounded-lg bg-[#EF4444] text-white font-bold text-xs shrink-0"
                >
                  Рестарт ↺
                </button>
              </div>
            )}
          </section>

          {/* List of Generated Personal Mistake Puzzles */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5">
            <h3 className="text-sm font-semibold text-[#F3F4F6] mb-3">
              Очередь задач из ваших реальных партий ({effectivePuzzles.length})
            </h3>
            <div className="space-y-2">
              {effectivePuzzles.map((item, idx) => {
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectPuzzleByIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-[#121212] border-[#D97706]'
                        : 'bg-[#121212] border-[#2A2A2E] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F3F4F6]">
                        0{idx + 1}. {item.motifLabelRu} · против {item.gameOpponent}
                      </div>
                      <div className="text-[11px] font-mono text-[#9CA3AF] mt-0.5">
                        Зевок в партии: {item.blunderMovePlayedSan} · Решение: {item.solutionSan}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#D97706] shrink-0">
                      {isCurrent ? 'Активна' : 'Открыть →'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
