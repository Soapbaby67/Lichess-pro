import React, { useState, useEffect } from 'react';
import {
  BoardThemeId,
  POST_GAME_ANALYSIS_MOVES,
  CRITICAL_MOMENTS_CARDS,
  applyUciMoveToFen,
} from '../logic/chessAnalytics';
import {
  InteractiveChessboard,
  SmoothedEvalBarWidget,
  AdaptiveChessClockWidget,
  BOARD_THEMES,
} from './InteractiveChessboard';
import { triggerFlutterHaptic, HapticEventLog } from '../utils/haptics';

interface AnalysisAndBoardViewProps {
  externalFenOverride?: { fen: string; label: string; evalCp: number } | null;
  onClearExternalFen?: () => void;
  hapticLogs: HapticEventLog[];
  onLogHaptic: (entry: HapticEventLog) => void;
}

export function AnalysisAndBoardView({
  externalFenOverride,
  onClearExternalFen,
  hapticLogs,
  onLogHaptic,
}: AnalysisAndBoardViewProps) {
  const [activePlyIdx, setActivePlyIdx] = useState<number>(2);
  const [customFen, setCustomFen] = useState<string | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>('oled_minimalist');
  const [legalDotOpacity, setLegalDotOpacity] = useState<number>(0.55);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState<boolean>(false);
  const [gameStatusBanner, setGameStatusBanner] = useState<string | null>(null);

  // Clock simulation state
  const [clockRunning, setClockRunning] = useState<boolean>(false);
  const [whiteClockMs, setWhiteClockMs] = useState<number>(24_800);
  const [blackClockMs, setBlackClockMs] = useState<number>(9_400);

  const currentPly = POST_GAME_ANALYSIS_MOVES[activePlyIdx] || POST_GAME_ANALYSIS_MOVES[0];

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
    const clamped = Math.max(0, Math.min(POST_GAME_ANALYSIS_MOVES.length - 1, idx));
    const targetPly = POST_GAME_ANALYSIS_MOVES[clamped];
    setActivePlyIdx(clamped);
    setCustomFen(null);
    onClearExternalFen?.();
    setWhiteClockMs(targetPly.whiteClockMs);
    setBlackClockMs(targetPly.blackClockMs);
    triggerFlutterHaptic('HapticFeedback.selectionClick()', reason, onLogHaptic);
  };

  const handleMakeMoveOnBoard = (uci: string, fromSq: string, toSq: string) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262629]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6]">
            02. Модернизированная доска, Eval Bar и Послематчевый анализ QoL
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            True Dark OLED <code className="font-mono text-xs text-[#D97706]">#121212</code> · Сглаженный Eval Bar · Адаптивные часы (&lt;30с / &lt;10с) · Один клик к перелому
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
                setGameStatusBanner('Предложение ничьей отправлено сопернику через WebSocket.');
                setQuickActionsOpen(false);
              }}
              className="py-2.5 px-4 rounded-lg bg-[#121212] hover:bg-[#27272A] border border-[#2E2E32] text-xs font-semibold text-[#FDE68A] transition-colors"
            >
              Предложить ничью (½–½)
            </button>

            <button
              type="button"
              onClick={() => {
                triggerFlutterHaptic(
                  'HapticFeedback.heavyImpact()',
                  'Подтверждение сдачи партии',
                  onLogHaptic
                );
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
            playerName="DarkSquare99"
            rating={2160}
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
            playerName="Вы (Grandmaster_RU)"
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
              <span className="text-[#9CA3AF]">Время на ход: {currentPly.moveTimeSec}с</span>
            </div>

            <button
              type="button"
              onClick={() => handleSelectPly(activePlyIdx + 1, 'Следующий ход анализа')}
              disabled={activePlyIdx >= POST_GAME_ANALYSIS_MOVES.length - 1}
              className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#2E2E32] text-xs font-semibold text-[#F3F4F6] disabled:opacity-40 hover:bg-[#27272A]"
            >
              След. ход →
            </button>
          </div>
        </div>

        {/* Right Column: One-Click Critical Moments + Board Customizer + Clock & Haptic Controls */}
        <div className="lg:col-span-6 space-y-5">
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
                const isSelected = activePlyIdx === card.plyIndex && !customFen && !externalFenOverride;
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
                    onClick={() =>
                      handleSelectPly(
                        card.plyIndex,
                        `Один клик к перелому: ${card.badgeRu} (${card.san})`
                      )
                    }
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

          {/* Visual & Aesthetics: Board Themes, Dot Opacity & Clock Threshold Simulator */}
          <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 space-y-4">
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Кастомизация доски и тестирование индикаторов цейтнота
            </h2>

            {/* Board Theme Selector */}
            <div>
              <div className="text-xs text-[#9CA3AF] mb-2">
                Стиль шахматной доски (Custom Board Styles):
              </div>
              <div className="grid grid-cols-3 gap-2">
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
                        setBoardTheme(tId);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        active
                          ? 'bg-[#121212] border-[#D97706]'
                          : 'bg-[#121212] border-[#2A2A2E] hover:border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
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

            {/* Legal Move Dot Opacity Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="dot-opacity-slider" className="text-[#9CA3AF]">
                  Прозрачность маркеров легальных ходов (кликните по фигуре на доске):
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
