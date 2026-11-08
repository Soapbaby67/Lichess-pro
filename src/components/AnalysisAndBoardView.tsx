import React, { useState, useEffect, useRef } from 'react';
import {
  BoardThemeId,
  PieceSetId,
  AnalyzedPlyDto,
  RealPlayedGameSummaryDto,
  POST_GAME_ANALYSIS_MOVES,
  CRITICAL_MOMENTS_CARDS,
  applyUciMoveToFen,
  replayUciMovesToAnalyzedPlies,
} from '../logic/chessAnalytics';
import {
  InteractiveChessboard,
  SmoothedEvalBarWidget,
  AdaptiveChessClockWidget,
  BOARD_THEMES,
  PIECE_SETS,
} from './InteractiveChessboard';
import {
  startLichessAiMatch,
  connectLichessGameStream,
  sendLichessBoardMove,
  resignLichessBoardGame,
} from '../logic/lichessApiClient';
import { triggerFlutterHaptic, HapticEventLog } from '../utils/haptics';

interface AnalysisAndBoardViewProps {
  externalFenOverride?: { fen: string; label: string; evalCp: number } | null;
  onClearExternalFen?: () => void;
  externalRealGame?: RealPlayedGameSummaryDto | null;
  onClearExternalRealGame?: () => void;
  boardTheme: BoardThemeId;
  onChangeBoardTheme: (theme: BoardThemeId) => void;
  pieceSet: PieceSetId;
  onChangePieceSet: (pieceSet: PieceSetId) => void;
  lichessToken: string;
  onOpenAccountModal: () => void;
  hapticLogs: HapticEventLog[];
  onLogHaptic: (entry: HapticEventLog) => void;
}

export function AnalysisAndBoardView({
  externalFenOverride,
  onClearExternalFen,
  externalRealGame,
  onClearExternalRealGame,
  boardTheme,
  onChangeBoardTheme,
  pieceSet,
  onChangePieceSet,
  lichessToken,
  onOpenAccountModal,
  hapticLogs,
  onLogHaptic,
}: AnalysisAndBoardViewProps) {
  const [activePlyIdx, setActivePlyIdx] = useState<number>(2);
  const [customFen, setCustomFen] = useState<string | null>(null);
  const [legalDotOpacity, setLegalDotOpacity] = useState<number>(0.55);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState<boolean>(false);
  const [gameStatusBanner, setGameStatusBanner] = useState<string | null>(null);

  // Clock state
  const [clockRunning, setClockRunning] = useState<boolean>(false);
  const [whiteClockMs, setWhiteClockMs] = useState<number>(24_800);
  const [blackClockMs, setBlackClockMs] = useState<number>(9_400);

  // Live Lichess Board API Game state
  const [liveGameId, setLiveGameId] = useState<string | null>(null);
  const [liveAiLevel, setLiveAiLevel] = useState<number>(4);
  const [liveClockMinutes, setLiveClockMinutes] = useState<number>(3);
  const [liveIncrementSec, setLiveIncrementSec] = useState<number>(2);
  const [liveColorChoice, setLiveColorChoice] = useState<'white' | 'black' | 'random'>('white');
  const [isStartingLiveGame, setIsStartingLiveGame] = useState<boolean>(false);
  const [liveMovesPlies, setLiveMovesPlies] = useState<AnalyzedPlyDto[] | null>(null);
  const stopLiveStreamRef = useRef<(() => void) | null>(null);

  // Determine active move list (Live Lichess game > Real inspected game > Default Post-Game Analysis)
  const inspectedRealGamePlies = React.useMemo(() => {
    if (!externalRealGame) return null;
    const plies = replayUciMovesToAnalyzedPlies(
      externalRealGame.movesUci,
      externalRealGame.movesSan,
      externalRealGame.clocksCentis
    );
    return plies.length > 0 ? plies : null;
  }, [externalRealGame]);

  const activeMoveList =
    liveMovesPlies && liveMovesPlies.length > 0
      ? liveMovesPlies
      : inspectedRealGamePlies ?? POST_GAME_ANALYSIS_MOVES;

  const currentPly =
    activeMoveList[Math.min(activePlyIdx, activeMoveList.length - 1)] ||
    activeMoveList[0];

  useEffect(() => {
    if (externalRealGame && inspectedRealGamePlies) {
      const targetIdx = Math.max(0, inspectedRealGamePlies.length - 1);
      setActivePlyIdx(targetIdx);
      setCustomFen(null);
      const ply = inspectedRealGamePlies[targetIdx];
      if (ply) {
        setWhiteClockMs(ply.whiteClockMs);
        setBlackClockMs(ply.blackClockMs);
      }
      setFlipped(externalRealGame.playerColor === 'black');
    }
  }, [externalRealGame, inspectedRealGamePlies]);

  useEffect(() => {
    return () => {
      stopLiveStreamRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!clockRunning) return;
    const interval = setInterval(() => {
      setBlackClockMs((prev) => Math.max(0, prev - 200));
    }, 200);
    return () => clearInterval(interval);
  }, [clockRunning]);

  const effectiveFen = externalFenOverride?.fen ?? customFen ?? currentPly.fen;
  const effectiveEvalCp = externalFenOverride?.evalCp ?? currentPly.evalCp;
  const effectiveMate = externalFenOverride ? undefined : currentPly.mate;

  const handleSelectPly = (idx: number, reason: string) => {
    const clamped = Math.max(0, Math.min(activeMoveList.length - 1, idx));
    const targetPly = activeMoveList[clamped];
    setActivePlyIdx(clamped);
    setCustomFen(null);
    onClearExternalFen?.();
    setWhiteClockMs(targetPly.whiteClockMs);
    setBlackClockMs(targetPly.blackClockMs);
    triggerFlutterHaptic('HapticFeedback.selectionClick()', reason, onLogHaptic);
  };

  const handleStartLiveLichessGame = async () => {
    if (!lichessToken.trim()) {
      onOpenAccountModal();
      return;
    }
    setIsStartingLiveGame(true);
    setGameStatusBanner(null);
    stopLiveStreamRef.current?.();

    try {
      const created = await startLichessAiMatch(lichessToken, {
        level: liveAiLevel,
        clockLimitSec: liveClockMinutes * 60,
        clockIncrementSec: liveIncrementSec,
        color: liveColorChoice,
      });
      setLiveGameId(created.id);
      setCustomFen(null);
      onClearExternalFen?.();
      onClearExternalRealGame?.();
      setGameStatusBanner(
        `Живая партия Lichess #${created.id} запущена (Stockfish Level ${liveAiLevel})! Делайте ход на доске.`
      );

      const abortFn = await connectLichessGameStream(
        lichessToken,
        created.id,
        (state) => {
          const plies = replayUciMovesToAnalyzedPlies(state.movesUci);
          if (plies.length > 0) {
            setLiveMovesPlies(plies);
            setActivePlyIdx(plies.length - 1);
          }
          setCustomFen(null);
          setWhiteClockMs(state.wtimeMs);
          setBlackClockMs(state.btimeMs);
          if (state.status !== 'started' && state.status !== 'created') {
            setGameStatusBanner(
              `Партия Lichess #${created.id} завершена (${state.status}${state.winner ? `, победитель: ${state.winner}` : ''}).`
            );
          }
        },
        (errMsg) => {
          setGameStatusBanner(`Поток партии Lichess: ${errMsg}`);
        }
      );
      stopLiveStreamRef.current = abortFn;
    } catch (err) {
      setGameStatusBanner(
        err instanceof Error ? err.message : 'Ошибка запуска онлайн-партии Lichess'
      );
    } finally {
      setIsStartingLiveGame(false);
    }
  };

  const handleMakeMoveOnBoard = async (uci: string, fromSq: string, toSq: string) => {
    const res = applyUciMoveToFen(effectiveFen, uci);
    setCustomFen(res.nextFen);
    if (res.promoted) {
      triggerFlutterHaptic(
        'HapticFeedback.heavyImpact()',
        `Превращение пешки ${fromSq}→${toSq}`,
        onLogHaptic
      );
    } else if (res.captured) {
      triggerFlutterHaptic(
        'HapticFeedback.lightImpact()',
        `Взятие фигуры на поле ${toSq}`,
        onLogHaptic
      );
    } else {
      triggerFlutterHaptic(
        'HapticFeedback.selectionClick()',
        `Ход фигурой ${fromSq}→${toSq}`,
        onLogHaptic
      );
    }

    if (liveGameId && lichessToken) {
      try {
        await sendLichessBoardMove(lichessToken, liveGameId, uci);
      } catch (err) {
        setGameStatusBanner(
          err instanceof Error ? err.message : `Не удалось отправить ход ${uci} на Lichess`
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262629]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6]">
            02. Модернизированная доска, Темы, Фигуры и Онлайн-игра Lichess
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            6 стилей доски · 4 векторных набора фигур · Сглаженный Eval Bar · Прямое подключение к <code className="font-mono text-xs text-[#D97706]">lichess.org/api/board</code>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => {
              triggerFlutterHaptic(
                'HapticFeedback.mediumImpact()',
                'Вызов панели быстрых действий (жест свайп вниз)',
                onLogHaptic
              );
              setQuickActionsOpen((v) => !v);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#1E1E1E] hover:bg-[#27272A] border border-[#2E2E32] text-xs font-semibold text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
          >
            Быстрые действия (Свайп вниз)
          </button>
        </div>
      </div>

      {externalFenOverride && (
        <div className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-[#D97706] flex items-center justify-between gap-3">
          <div className="text-xs text-[#F3F4F6]">
            Открыта позиция из матрицы дебютов: <strong>{externalFenOverride.label}</strong>
          </div>
          <button
            type="button"
            onClick={() => onClearExternalFen?.()}
            className="text-xs font-semibold text-[#D97706] hover:underline whitespace-nowrap"
          >
            Вернуться к партии анализа
          </button>
        </div>
      )}

      {externalRealGame && (
        <div className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-[#10B981] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#F3F4F6]">
            Разбор реальной партии с Lichess:{' '}
            <strong>
              vs {externalRealGame.opponentName} ({externalRealGame.opponentRating})
            </strong>{' '}
            · {externalRealGame.eco} {externalRealGame.openingName} · Ходов:{' '}
            <span className="font-mono">{activeMoveList.length}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClearExternalRealGame?.();
              setActivePlyIdx(2);
            }}
            className="text-xs font-semibold text-[#10B981] hover:underline whitespace-nowrap"
          >
            Сбросить к демо-партии
          </button>
        </div>
      )}

      {gameStatusBanner && (
        <div className="px-4 py-3 rounded-xl bg-[#1E1E1E] border border-[#10B981] flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#10B981]">{gameStatusBanner}</span>
          <button
            type="button"
            onClick={() => setGameStatusBanner(null)}
            className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6]"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Quick Actions Sheet (Swipe Down Drawer) */}
      {quickActionsOpen && (
        <div
          role="dialog"
          aria-label="Панель быстрых действий"
          className="rounded-2xl bg-[#1E1E1E] border border-[#D97706]/60 p-4 space-y-3"
        >
          <div className="w-10 h-1.5 bg-[#3F3F46] rounded-full mx-auto" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F3F4F6]">
              Жест «Свайп вниз по доске» — Панель быстрых действий
            </span>
            <button
              type="button"
              onClick={() => setQuickActionsOpen(false)}
              className="text-xs text-[#9CA3AF] hover:text-[#F3F4F6]"
            >
              Скрыть
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerFlutterHaptic(
                  'HapticFeedback.selectionClick()',
                  'Флип ориентации шахматной доски',
                  onLogHaptic
                );
                setFlipped((f) => !f);
              }}
              className="py-2.5 px-4 rounded-lg bg-[#121212] hover:bg-[#27272A] border border-[#2E2E32] text-xs font-semibold text-[#F3F4F6] transition-colors"
            >
              Флип доски ({flipped ? 'Черные снизу' : 'Белые снизу'})
            </button>

            <button
              type="button"
              onClick={() => {
                triggerFlutterHaptic(
                  'HapticFeedback.mediumImpact()',
                  'Отправлено предложение ничьей',
                  onLogHaptic
                );
                setGameStatusBanner('Предложение ничьей отправлено сопернику через Lichess API.');
                setQuickActionsOpen(false);
              }}
              className="py-2.5 px-4 rounded-lg bg-[#121212] hover:bg-[#27272A] border border-[#2E2E32] text-xs font-semibold text-[#FDE68A] transition-colors"
            >
              Предложить ничью (½–½)
            </button>

            <button
              type="button"
              onClick={async () => {
                triggerFlutterHaptic(
                  'HapticFeedback.heavyImpact()',
                  'Подтверждение сдачи партии',
                  onLogHaptic
                );
                if (liveGameId && lichessToken) {
                  await resignLichessBoardGame(lichessToken, liveGameId);
                }
                setGameStatusBanner('Партия завершена: сдача зафиксирована.');
                setQuickActionsOpen(false);
              }}
              className="py-2.5 px-4 rounded-lg bg-[#451A1A] hover:bg-[#7F1D1D] border border-[#EF4444] text-xs font-semibold text-[#FCA5A5] transition-colors"
            >
              Сдаться
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Eval Bar + Chessboard + Adaptive Clocks */}
        <div className="lg:col-span-6 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 space-y-4">
          {/* Opponent Clock (Top) */}
          <AdaptiveChessClockWidget
            playerName={
              liveGameId
                ? `Stockfish Level ${liveAiLevel} (Lichess Live)`
                : externalRealGame
                  ? externalRealGame.opponentName
                  : 'DarkSquare99'
            }
            rating={externalRealGame ? externalRealGame.opponentRating : 2160}
            remainingMs={blackClockMs}
            isActive={true}
            sideLabel="Черные"
          />

          {/* Board + Smoothed Eval Bar Row */}
          <div className="flex items-stretch justify-center gap-3">
            <SmoothedEvalBarWidget
              evalCp={effectiveEvalCp}
              mate={effectiveMate}
              flipped={flipped}
            />

            <InteractiveChessboard
              fen={effectiveFen}
              themeId={boardTheme}
              pieceSetId={pieceSet}
              legalDotOpacity={legalDotOpacity}
              lastMoveFrom={currentPly.from}
              lastMoveTo={currentPly.to}
              flipped={flipped}
              onMakeUciMove={handleMakeMoveOnBoard}
              onSwipeStep={(dir) => {
                handleSelectPly(
                  dir === 'next' ? activePlyIdx + 1 : activePlyIdx - 1,
                  `Свайп по доске (${dir === 'next' ? 'вперед' : 'назад'})`
                );
              }}
              onSwipeDownQuickActions={() => {
                triggerFlutterHaptic(
                  'HapticFeedback.mediumImpact()',
                  'Свайп вниз: открытие быстрых действий',
                  onLogHaptic
                );
                setQuickActionsOpen(true);
              }}
            />
          </div>

          {/* Player Clock (Bottom) */}
          <AdaptiveChessClockWidget
            playerName={
              externalRealGame
                ? `Вы (${externalRealGame.playerColor === 'white' ? 'Белые' : 'Черные'})`
                : 'Вы (Grandmaster_RU)'
            }
            rating={2154}
            remainingMs={whiteClockMs}
            isActive={false}
            sideLabel="Белые"
          />

          {/* Move Scrubbing Bar (Swipe Left/Right or Click) */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2A2A2E]">
            <button
              type="button"
              onClick={() => handleSelectPly(activePlyIdx - 1, 'Предыдущий ход анализа')}
              disabled={activePlyIdx <= 0}
              className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2E2E32] text-xs font-semibold text-[#F3F4F6] disabled:opacity-40 hover:bg-[#27272A]"
            >
              ← Пред. ход
            </button>

            <div className="text-xs font-mono text-center text-[#F3F4F6]">
              <span className="font-bold text-[#D97706]">{currentPly.san}</span>
              {' · '}
              <span className="text-[#9CA3AF]">
                Ход {activePlyIdx + 1}/{activeMoveList.length} ({currentPly.moveTimeSec}с)
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPly(activePlyIdx + 1, 'Следующий ход анализа')}
              disabled={activePlyIdx >= activeMoveList.length - 1}
              className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2E2E32] text-xs font-semibold text-[#F3F4F6] disabled:opacity-40 hover:bg-[#27272A]"
            >
              След. ход →
            </button>
          </div>
        </div>

        {/* Right Column: Live Lichess Match Launcher + Board/Piece Customizer + Critical Moments */}
        <div className="lg:col-span-6 space-y-5">
          {/* Live Lichess Match Launcher (Board API) */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#F3F4F6]">
                  Живая онлайн-партия на сервере Lichess (Board API)
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Создает реальную игру на вашем аккаунте <code className="font-mono text-[#10B981]">lichess.org</code> и транслирует ходы в реальном времени
                </p>
              </div>
              {liveGameId && (
                <a
                  href={`https://lichess.org/${liveGameId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[#10B981] underline shrink-0"
                >
                  #{liveGameId} ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">
                  Уровень Stockfish
                </label>
                <select
                  value={liveAiLevel}
                  onChange={(e) => setLiveAiLevel(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#121212] border border-[#2E2E32] px-2.5 py-1.5 text-xs text-[#F3F4F6]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Уровень {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">
                  Контроль времени
                </label>
                <select
                  value={`${liveClockMinutes}+${liveIncrementSec}`}
                  onChange={(e) => {
                    const [m, inc] = e.target.value.split('+').map(Number);
                    setLiveClockMinutes(m);
                    setLiveIncrementSec(inc);
                  }}
                  className="w-full rounded-lg bg-[#121212] border border-[#2E2E32] px-2.5 py-1.5 text-xs text-[#F3F4F6]"
                >
                  <option value="3+0">3+0 Blitz</option>
                  <option value="3+2">3+2 Blitz</option>
                  <option value="5+0">5+0 Blitz</option>
                  <option value="10+0">10+0 Rapid</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">
                  Ваш цвет
                </label>
                <select
                  value={liveColorChoice}
                  onChange={(e) =>
                    setLiveColorChoice(e.target.value as 'white' | 'black' | 'random')
                  }
                  className="w-full rounded-lg bg-[#121212] border border-[#2E2E32] px-2.5 py-1.5 text-xs text-[#F3F4F6]"
                >
                  <option value="white">Белые</option>
                  <option value="black">Черные</option>
                  <option value="random">Случайный</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleStartLiveLichessGame}
                disabled={isStartingLiveGame}
                className="flex-1 py-2 px-4 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-[#121212] font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isStartingLiveGame
                  ? 'Создание партии на сервере Lichess...'
                  : lichessToken
                    ? 'Запустить реальную партию на Lichess.org'
                    : 'Войти по токену Lichess для запуска живой игры'}
              </button>
            </div>
          </section>

          {/* Visual & Aesthetics: 6 Board Themes + 4 Piece Sets + Dot Opacity */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 space-y-4">
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Новые дизайны тем доски (6) и наборов фигур (4)
            </h2>

            {/* 6 Board Themes */}
            <div>
              <div className="text-xs text-[#9CA3AF] mb-2">
                Стиль шахматной доски (Custom Board Styles):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((tId) => {
                  const spec = BOARD_THEMES[tId];
                  const active = boardTheme === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => {
                        triggerFlutterHaptic(
                          'HapticFeedback.selectionClick()',
                          `Стиль доски: ${spec.labelRu}`,
                          onLogHaptic
                        );
                        onChangeBoardTheme(tId);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        active
                          ? 'bg-[#121212] border-[#D97706]'
                          : 'bg-[#121212] border-[#2A2A2E] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-white/10"
                          style={{ backgroundColor: spec.lightSquare }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-white/10"
                          style={{ backgroundColor: spec.darkSquare }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-[#F3F4F6] truncate">
                        {spec.labelRu}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Vector Piece Sets */}
            <div className="pt-2 border-t border-[#2A2A2E]">
              <div className="text-xs text-[#9CA3AF] mb-2">
                Дизайн шахматных фигур (Custom Piece Sets):
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PIECE_SETS) as PieceSetId[]).map((pId) => {
                  const spec = PIECE_SETS[pId];
                  const active = pieceSet === pId;
                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => {
                        triggerFlutterHaptic(
                          'HapticFeedback.selectionClick()',
                          `Набор фигур: ${spec.labelRu}`,
                          onLogHaptic
                        );
                        onChangePieceSet(pId);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        active
                          ? 'bg-[#121212] border-[#10B981]'
                          : 'bg-[#121212] border-[#2A2A2E] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#F3F4F6] truncate">
                        {spec.labelRu}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] truncate mt-0.5">
                        {spec.subtitleRu}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legal Move Dot Opacity Slider */}
            <div className="pt-2 border-t border-[#2A2A2E]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="dot-opacity-slider" className="text-[#9CA3AF]">
                  Прозрачность маркеров легальных ходов:
                </label>
                <span className="font-mono font-semibold text-[#F3F4F6]">
                  {Math.round(legalDotOpacity * 100)}%
                </span>
              </div>
              <input
                id="dot-opacity-slider"
                type="range"
                min={15}
                max={90}
                value={Math.round(legalDotOpacity * 100)}
                onChange={(e) => setLegalDotOpacity(Number(e.target.value) / 100)}
                className="w-full accent-[#D97706] cursor-pointer"
              />
            </div>

            {/* Adaptive Clock Threshold Simulator */}
            <div className="pt-2 border-t border-[#2A2A2E]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#9CA3AF]">
                  Проверка порогов часов (&lt; 30 сек предупреждение, &lt; 10 сек пульсация):
                </span>
                <button
                  type="button"
                  onClick={() => setClockRunning((r) => !r)}
                  className="text-xs font-semibold text-[#D97706] hover:underline"
                >
                  {clockRunning ? 'Пауза таймера' : 'Запустить ход часов'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWhiteClockMs(142_000);
                    setBlackClockMs(138_000);
                    triggerFlutterHaptic('HapticFeedback.selectionClick()', 'Часы: Штатный режим 02:18', onLogHaptic);
                  }}
                  className="py-1.5 px-2.5 rounded bg-[#121212] border border-[#2A2A2E] text-xs font-mono text-[#F3F4F6] hover:border-[#3F3F46]"
                >
                  Норма (02:18)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWhiteClockMs(24_800);
                    setBlackClockMs(22_400);
                    triggerFlutterHaptic('HapticFeedback.lightImpact()', 'Часы: Порог < 30 секунд', onLogHaptic);
                  }}
                  className="py-1.5 px-2.5 rounded bg-[#422006] border border-[#D97706] text-xs font-mono text-[#FDE68A]"
                >
                  &lt; 30с (00:22)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWhiteClockMs(18_200);
                    setBlackClockMs(6_400);
                    triggerFlutterHaptic('HapticFeedback.heavyImpact()', 'Часы: Критический цейтнот < 10 секунд', onLogHaptic);
                  }}
                  className="py-1.5 px-2.5 rounded bg-[#451A1A] border border-[#EF4444] text-xs font-mono text-[#FCA5A5]"
                >
                  &lt; 10с (00:06.4)
                </button>
              </div>
            </div>
          </section>

          {/* One-Click Critical Moments ("Один клик к перелому") */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5">
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Один клик к перелому (Post-Game Key Moments)
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Мгновенный переход к ключевым позициям партии с пересчетом Eval Bar и часов
            </p>

            <div className="space-y-2.5 mt-4">
              {CRITICAL_MOMENTS_CARDS.map((card) => {
                const isSelected =
                  activePlyIdx === card.plyIndex &&
                  !customFen &&
                  !externalFenOverride &&
                  !externalRealGame &&
                  !liveMovesPlies;
                const accentBorder =
                  card.kind === 'critical_blunder'
                    ? 'border-[#EF4444]'
                    : card.kind === 'turning_point'
                      ? 'border-[#D97706]'
                      : 'border-[#10B981]';

                const badgeColor =
                  card.kind === 'critical_blunder'
                    ? 'text-[#FCA5A5]'
                    : card.kind === 'turning_point'
                      ? 'text-[#FDE68A]'
                      : 'text-[#6EE7B7]';

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      onClearExternalRealGame?.();
                      setLiveMovesPlies(null);
                      handleSelectPly(
                        card.plyIndex,
                        `Один клик к перелому: ${card.badgeRu} (${card.san})`
                      );
                    }}
                    className={`w-full text-left p-3.5 rounded-xl bg-[#121212] border transition-colors flex items-center justify-between gap-4 ${
                      isSelected ? accentBorder : 'border-[#2A2A2E] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold ${badgeColor}`}>
                          {card.badgeRu}
                        </span>
                        <span aria-hidden="true" className="text-[#6B7280]">·</span>
                        <span className="font-mono font-bold text-[#F3F4F6]">
                          {card.san}
                        </span>
                        <span aria-hidden="true" className="text-[#6B7280]">·</span>
                        <span className="font-mono text-[#9CA3AF]">
                          Лучший ход: {card.bestEngineMoveSan}
                        </span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">
                        {card.summaryRu}
                      </p>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="text-xs font-bold text-[#F3F4F6]">
                        +{(card.evalAfterCp / 100).toFixed(1)}
                      </div>
                      <div className="text-[11px] text-[#D97706] mt-0.5">
                        Перейти →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tactile Haptics Console */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#F3F4F6]">
                Тактильная отдача Flutter (<code className="font-mono text-xs text-[#D97706]">HapticFeedback</code>)
              </h2>
              <span className="text-[11px] font-mono text-[#9CA3AF]">
                services.dart
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() =>
                  triggerFlutterHaptic(
                    'HapticFeedback.lightImpact()',
                    'Взятие фигуры (Capture)',
                    onLogHaptic
                  )
                }
                className="p-2 rounded-lg bg-[#121212] border border-[#2A2A2E] hover:border-[#D97706] text-left"
              >
                <div className="text-xs font-semibold text-[#F3F4F6]">Взятие фигуры</div>
                <div className="text-[10px] font-mono text-[#10B981] mt-0.5">lightImpact()</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerFlutterHaptic(
                    'HapticFeedback.heavyImpact()',
                    'Шах королю (Check)',
                    onLogHaptic
                  )
                }
                className="p-2 rounded-lg bg-[#121212] border border-[#2A2A2E] hover:border-[#D97706] text-left"
              >
                <div className="text-xs font-semibold text-[#F3F4F6]">Шах королю</div>
                <div className="text-[10px] font-mono text-[#EF4444] mt-0.5">heavyImpact()</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerFlutterHaptic(
                    'HapticFeedback.selectionClick()',
                    'Установка премува (Premove)',
                    onLogHaptic
                  )
                }
                className="p-2 rounded-lg bg-[#121212] border border-[#2A2A2E] hover:border-[#D97706] text-left"
              >
                <div className="text-xs font-semibold text-[#F3F4F6]">Премув</div>
                <div className="text-[10px] font-mono text-[#D97706] mt-0.5">selectionClick()</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerFlutterHaptic(
                    'HapticFeedback.mediumImpact()',
                    'Превращение пешки (Promotion)',
                    onLogHaptic
                  )
                }
                className="p-2 rounded-lg bg-[#121212] border border-[#2A2A2E] hover:border-[#D97706] text-left"
              >
                <div className="text-xs font-semibold text-[#F3F4F6]">Превращение</div>
                <div className="text-[10px] font-mono text-[#FDE68A] mt-0.5">mediumImpact()</div>
              </button>
            </div>

            {hapticLogs.length > 0 && (
              <div className="pt-2 border-t border-[#2A2A2E] space-y-1">
                {hapticLogs.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]"
                  >
                    <span className="text-[#F3F4F6]">{item.reasonRu}</span>
                    <span className="text-[#10B981]">
                      {item.method} · {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
