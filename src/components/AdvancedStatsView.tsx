import React, { useState, useMemo } from 'react';
import {
  TimeframeFilter,
  PerfControl,
  RepertoireColorFilter,
  OpeningStatDto,
  PersonalPuzzleDto,
  RealPlayedGameSummaryDto,
  STREAK_BY_PERF,
  RATING_SERIES_BY_TIMEFRAME,
  OPENING_REPERTOIRE_DATA,
  TIME_HEATMAP_BUCKETS,
  STAGE_ACCURACY_SUMMARY,
  TACTICAL_MISTAKE_PATTERNS,
  PERSONAL_MISTAKE_PUZZLES,
  DEFAULT_TERMINATION_BREAKDOWN,
  DEFAULT_COLOR_PERFORMANCE,
  DEFAULT_RECENT_GAMES,
  computeWinDrawLossPercentages,
  detectOpeningBlindSpots,
  classifyMoveTimeAnomaly,
} from '../logic/chessAnalytics';
import {
  RealLichessAnalyticsBundle,
  LichessAccountProfile,
} from '../logic/lichessApiClient';
import { triggerFlutterHaptic, HapticEventLog } from '../utils/haptics';

interface AdvancedStatsViewProps {
  realAnalytics?: RealLichessAnalyticsBundle | null;
  accountProfile?: LichessAccountProfile | null;
  onOpenAccountModal: () => void;
  onInspectOpeningOnBoard: (opening: OpeningStatDto) => void;
  onInspectRealGameOnBoard: (game: RealPlayedGameSummaryDto) => void;
  onStartPersonalPuzzle: (puzzle: PersonalPuzzleDto) => void;
  onLogHaptic: (entry: HapticEventLog) => void;
}

export function AdvancedStatsView({
  realAnalytics,
  accountProfile,
  onOpenAccountModal,
  onInspectOpeningOnBoard,
  onInspectRealGameOnBoard,
  onStartPersonalPuzzle,
  onLogHaptic,
}: AdvancedStatsViewProps) {
  const [perf, setPerf] = useState<PerfControl>('blitz');
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('week');
  const [colorFilter, setColorFilter] = useState<RepertoireColorFilter>('all');
  const [onlyBlindSpots, setOnlyBlindSpots] = useState<boolean>(false);
  const [ecoSearch, setEcoSearch] = useState<string>('');
  const [selectedPointIdx, setSelectedPointIdx] = useState<number>(6);

  const streakForm = realAnalytics ? realAnalytics.streakAndForm : STREAK_BY_PERF[perf];
  const ratingSeries =
    realAnalytics && realAnalytics.ratingPoints.length > 0
      ? realAnalytics.ratingPoints
      : RATING_SERIES_BY_TIMEFRAME[timeframe];
  const openingData = realAnalytics?.openings ?? OPENING_REPERTOIRE_DATA;
  const timeBuckets = realAnalytics?.timeBuckets ?? TIME_HEATMAP_BUCKETS;
  const stageSummary = realAnalytics?.stageAccuracy ?? STAGE_ACCURACY_SUMMARY;
  const mistakePatterns = TACTICAL_MISTAKE_PATTERNS;
  const personalPuzzles =
    realAnalytics?.generatedPuzzles ?? PERSONAL_MISTAKE_PUZZLES;
  const terminationData =
    realAnalytics?.terminationBreakdown ?? DEFAULT_TERMINATION_BREAKDOWN;
  const colorPerf =
    realAnalytics?.colorPerformance ?? DEFAULT_COLOR_PERFORMANCE;
  const recentGames =
    realAnalytics && realAnalytics.recentGames.length > 0
      ? realAnalytics.recentGames
      : DEFAULT_RECENT_GAMES;

  const activeRatingPoint =
    ratingSeries[Math.min(selectedPointIdx, ratingSeries.length - 1)] || ratingSeries[0];

  const blindSpotIds = useMemo(() => {
    return new Set(detectOpeningBlindSpots(openingData).map((o) => o.id));
  }, [openingData]);

  const filteredOpenings = useMemo(() => {
    return openingData.filter((item) => {
      if (colorFilter !== 'all' && item.side !== colorFilter) return false;
      if (onlyBlindSpots && !blindSpotIds.has(item.id)) return false;
      if (ecoSearch.trim().length > 0) {
        const q = ecoSearch.toLowerCase();
        const match =
          item.eco.toLowerCase().includes(q) ||
          item.nameRu.toLowerCase().includes(q) ||
          item.variationRu.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [openingData, colorFilter, onlyBlindSpots, ecoSearch, blindSpotIds]);

  const minRating = Math.min(...ratingSeries.map((d) => d.rating)) - 15;
  const maxRating = Math.max(...ratingSeries.map((d) => d.rating)) + 15;
  const ratingRange = Math.max(20, maxRating - minRating);

  const chartPoints = ratingSeries.map((pt, idx) => {
    const x =
      ratingSeries.length <= 1
        ? 50
        : 36 + (idx / (ratingSeries.length - 1)) * (560 - 72);
    const y = 165 - ((pt.rating - minRating) / ratingRange) * 130;
    return { x, y, pt, idx };
  });

  const polylinePoints = chartPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `36,172 ${polylinePoints} ${chartPoints[chartPoints.length - 1]?.x ?? 524},172`;

  const formStatusInfo =
    streakForm.formStatus === 'peak'
      ? { label: 'ПИК ФОРМЫ', color: 'text-[#10B981]' }
      : streakForm.formStatus === 'stable'
        ? { label: 'СТАБИЛЬНОСТЬ', color: 'text-[#D97706]' }
        : { label: 'СПАД', color: 'text-[#EF4444]' };

  const whiteSideSummary = {
    label: 'За Белых ♔',
    wins: colorPerf.whiteWins,
    draws: colorPerf.whiteDraws,
    losses: colorPerf.whiteLosses,
    avgAccuracyPct: colorPerf.whiteAvgAccuracy,
  };
  const blackSideSummary = {
    label: 'За Черных ♚',
    wins: colorPerf.blackWins,
    draws: colorPerf.blackDraws,
    losses: colorPerf.blackLosses,
    avgAccuracyPct: colorPerf.blackAvgAccuracy,
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Perf Selector & Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262629]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6]">
            01. Продвинутая статистика и аналитика партий
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {realAnalytics ? (
              <>
                Аккаунт Lichess:{' '}
                <strong className="text-[#10B981] font-mono">
                  {realAnalytics.username}
                </strong>{' '}
                · Проанализировано реальных партий:{' '}
                <strong className="text-[#F3F4F6] font-mono tabular-nums">
                  {realAnalytics.totalAnalyzedGames}
                </strong>{' '}
                · Прямая синхронизация с <code className="font-mono text-xs text-[#D97706]">lichess.org/api</code>
              </>
            ) : (
              <>
                Локальная база партий Isar + Lichess API · Модуль{' '}
                <code className="font-mono text-xs text-[#D97706]">
                  lib/src/view/stats/advanced_stats_screen.dart
                </code>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={onOpenAccountModal}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors border whitespace-nowrap shrink-0 ${
              realAnalytics
                ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981] hover:bg-[#10B981]/25'
                : 'bg-[#1E1E1E] border-[#D97706] text-[#F59E0B] hover:bg-[#27272A]'
            }`}
          >
            {realAnalytics
              ? `✓ Аккаунт: ${realAnalytics.username} (${realAnalytics.totalAnalyzedGames} парт.)`
              : 'Подключить аккаунт Lichess (API токен)'}
          </button>

          {/* Interactive Perf Filter Control */}
          <div
            role="group"
            aria-label="Выбор контроля времени"
            className="flex items-center gap-1 p-1 rounded-lg bg-[#1E1E1E] border border-[#2C2C30]"
          >
            {(
              [
                { id: 'bullet', label: 'Bullet' },
                { id: 'blitz', label: 'Blitz 3+0' },
                { id: 'rapid', label: 'Rapid 10+0' },
                { id: 'classical', label: 'Classical' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerFlutterHaptic(
                    'HapticFeedback.selectionClick()',
                    `Переключение дисциплины: ${item.label}`,
                    onLogHaptic
                  );
                  setPerf(item.id);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  perf === item.id
                    ? 'bg-[#D97706] text-[#121212]'
                    : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1: Streak & Form Card + Rating Progress fl_chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Streak & Form Card */}
        <section className="lg:col-span-5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#F3F4F6]">
                Карточка «Streak & Form»
              </h2>
              <span className="text-xs font-mono text-[#9CA3AF]">
                Последние 10 партий ({perf.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[#2A2A2E]">
              <div>
                <div className="text-xs text-[#9CA3AF]">Текущий стрик</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[#10B981] mt-1">
                  {streakForm.currentWinStreak} W
                </div>
                <div className="text-[11px] text-[#9CA3AF] mt-1">
                  Рекорд сезона: {streakForm.bestWinStreakSeason}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#9CA3AF]">Ср. точность (10)</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[#F3F4F6] mt-1">
                  {streakForm.last10AccuracyPct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[#9CA3AF] mt-1 font-mono tabular-nums">
                  +{streakForm.last10Record.w} ={streakForm.last10Record.d} -{streakForm.last10Record.l}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#9CA3AF]">Статус формы</div>
                <div className={`text-base sm:text-lg font-bold tracking-tight mt-1.5 ${formStatusInfo.color}`}>
                  {formStatusInfo.label}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-[#9CA3AF] mt-1">
                  {streakForm.ratingDeltaLast10 >= 0 ? `+${streakForm.ratingDeltaLast10}` : streakForm.ratingDeltaLast10} пт рейтинга
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2A2A2E] flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>
              {accountProfile
                ? `Рейтинг Lichess (${perf}): ${accountProfile.perfs[perf]?.rating ?? '—'}`
                : 'Расчет точности: Stockfish 16.1 NNUE'}
            </span>
            <span className="font-mono tabular-nums text-[#F3F4F6]">
              ACPL: 21.4 · Зевков: 0.4/партию
            </span>
          </div>
        </section>

        {/* Visual Progress Chart (fl_chart) */}
        <section className="lg:col-span-7 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#F3F4F6]">
                График динамики рейтинга (<code className="font-mono text-xs text-[#D97706]">fl_chart</code>)
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Выбрана точка: <span className="text-[#F3F4F6] font-mono">{activeRatingPoint.timestamp}</span> · Рейтинг{' '}
                <span className="text-[#10B981] font-mono font-semibold">{activeRatingPoint.rating}</span> · Точность{' '}
                <span className="text-[#F3F4F6] font-mono">{activeRatingPoint.accuracy}%</span> ({activeRatingPoint.opponent})
              </p>
            </div>

            <div
              role="group"
              aria-label="Период графика рейтинга"
              className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#2A2A2E]"
            >
              {(
                [
                  { id: 'day', label: 'День' },
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'all', label: 'Всё время' },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    triggerFlutterHaptic(
                      'HapticFeedback.selectionClick()',
                      `Фильтр графика: ${tf.label}`,
                      onLogHaptic
                    );
                    setTimeframe(tf.id);
                    setSelectedPointIdx(RATING_SERIES_BY_TIMEFRAME[tf.id].length - 1);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    timeframe === tf.id
                      ? 'bg-[#D97706] text-[#121212] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <svg
              viewBox="0 0 560 195"
              className="w-full h-44 overflow-visible select-none"
              role="img"
              aria-label="Интерактивный график изменения рейтинга"
            >
              <defs>
                <linearGradient id="ratingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[35, 80, 125, 170].map((yLine, idx) => {
                const labelVal = Math.round(maxRating - (idx / 3) * ratingRange);
                return (
                  <g key={yLine}>
                    <line
                      x1="36"
                      y1={yLine}
                      x2="532"
                      y2={yLine}
                      stroke="#2A2A2E"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="30"
                      y={yLine + 4}
                      textAnchor="end"
                      className="fill-[#9CA3AF] text-[10px] font-mono"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              <polygon points={areaPoints} fill="url(#ratingAreaGrad)" />
              <polyline
                fill="none"
                stroke="#10B981"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {chartPoints.map(({ x, y, pt, idx }) => {
                const isSelected = idx === Math.min(selectedPointIdx, chartPoints.length - 1);
                return (
                  <g
                    key={`${pt.label}-${idx}`}
                    className="cursor-pointer"
                    onClick={() => {
                      triggerFlutterHaptic(
                        'HapticFeedback.selectionClick()',
                        `Точка графика ${pt.label}: ${pt.rating}`,
                        onLogHaptic
                      );
                      setSelectedPointIdx(idx);
                    }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 6 : 4}
                      fill={isSelected ? '#D97706' : '#10B981'}
                      stroke="#121212"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y="190"
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        isSelected ? 'fill-[#F3F4F6] font-bold' : 'fill-[#9CA3AF]'
                      }`}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>
      </div>

      {/* NEW ROW: Expanded Account Breakdown (Color Performance + Termination Reasons + Recent Real Games) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Color Comparison & Termination Reasons */}
        <section className="lg:col-span-6 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Увеличенная статистика: Эффективность по цвету и исходам
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Детализация побед/поражений за белых и черных, средний рейтинг соперников и причины завершения партий
            </p>

            {/* White vs Black Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {[whiteSideSummary, blackSideSummary].map((sideItem) => {
                const wdl = computeWinDrawLossPercentages(
                  sideItem.wins,
                  sideItem.draws,
                  sideItem.losses
                );
                return (
                  <div
                    key={sideItem.label}
                    className="rounded-lg bg-[#121212] border border-[#2A2A2E] p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F3F4F6]">{sideItem.label}</span>
                      <span className="text-xs font-mono text-[#10B981] font-semibold tabular-nums">
                        {wdl.winPct}% Побед ({wdl.totalGames} парт.)
                      </span>
                    </div>
                    <div className="h-2 rounded overflow-hidden flex bg-[#1E1E1E]">
                      <div style={{ width: `${wdl.winPct}%` }} className="bg-[#10B981]" />
                      <div style={{ width: `${wdl.drawPct}%` }} className="bg-[#6B7280]" />
                      <div style={{ width: `${wdl.lossPct}%` }} className="bg-[#EF4444]" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF] tabular-nums">
                      <span>Точность: <strong className="text-[#F3F4F6]">{sideItem.avgAccuracyPct}%</strong></span>
                      <span>Ср. соп.: <strong className="text-[#F3F4F6]">{colorPerf.avgOpponentRating}</strong></span>
                      <span>Пик: <strong className="text-[#D97706]">{colorPerf.peakRating}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Termination Breakdown */}
          <div className="pt-3 border-t border-[#2A2A2E] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono tabular-nums">
            <div className="p-2.5 rounded-lg bg-[#121212] border border-[#262629]">
              <div className="text-[10px] text-[#9CA3AF] uppercase">Победа матом</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                {terminationData.mateWins}
              </div>
              <div className="text-[10px] text-[#EF4444]">
                Пораж.: {terminationData.mateLosses}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121212] border border-[#262629]">
              <div className="text-[10px] text-[#9CA3AF] uppercase">Сдача соп.</div>
              <div className="text-sm font-bold text-[#10B981] mt-0.5">
                {terminationData.resignWins}
              </div>
              <div className="text-[10px] text-[#EF4444]">
                Своя сдача: {terminationData.resignLosses}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121212] border border-[#262629]">
              <div className="text-[10px] text-[#9CA3AF] uppercase">По времени (Флаг)</div>
              <div className="text-sm font-bold text-[#D97706] mt-0.5">
                +{terminationData.timeoutWins} / -{terminationData.timeoutLosses}
              </div>
              <div className="text-[10px] text-[#9CA3AF]">Контроль флага</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#121212] border border-[#262629]">
              <div className="text-[10px] text-[#9CA3AF] uppercase">Ничьи (½-½)</div>
              <div className="text-sm font-bold text-[#F3F4F6] mt-0.5">
                {terminationData.draws}
              </div>
              <div className="text-[10px] text-[#9CA3AF]">Пат / Повтор</div>
            </div>
          </div>
        </section>

        {/* Recent Real Games Table with 1-Click Load to Board */}
        <section className="lg:col-span-6 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#F3F4F6]">
                  История сыгранных партий Lichess ({recentGames.length})
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Нажмите «Разбор партии →», чтобы пошагово воспроизвести все ходы и часы на доске
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#2A2A2E] mt-3 max-h-64 overflow-y-auto pr-1">
              {recentGames.slice(0, 6).map((gm) => {
                const resBadge =
                  gm.result === 'W'
                    ? { text: 'ПОБЕДА', cls: 'text-[#10B981]' }
                    : gm.result === 'L'
                      ? { text: 'ПОРАЖЕНИЕ', cls: 'text-[#EF4444]' }
                      : { text: 'НИЧЬЯ', cls: 'text-[#9CA3AF]' };
                return (
                  <div
                    key={gm.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-mono font-bold ${resBadge.cls}`}>
                          {resBadge.text}
                        </span>
                        <span className="text-[#6B7280]">·</span>
                        <span className="font-semibold text-[#F3F4F6] truncate">
                          vs {gm.opponentName} ({gm.opponentRating})
                        </span>
                        <span className="text-[#6B7280]">·</span>
                        <span className="font-mono text-[#9CA3AF]">{gm.createdAtStr}</span>
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] font-mono mt-0.5 truncate">
                        {gm.eco} {gm.openingName} · {gm.statusRu}
                        {gm.accuracyPct ? ` · Точность ${gm.accuracyPct}%` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerFlutterHaptic(
                          'HapticFeedback.mediumImpact()',
                          `Загрузка партии vs ${gm.opponentName} на доску анализа`,
                          onLogHaptic
                        );
                        onInspectRealGameOnBoard(gm);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-[#27272A] border border-[#2E2E32] text-xs font-semibold text-[#D97706] transition-colors whitespace-nowrap shrink-0"
                    >
                      Разбор партии →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#2A2A2E] flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Полная запись ходов UCI + пошаговый хронометраж</span>
            <button
              type="button"
              onClick={onOpenAccountModal}
              className="text-[#D97706] hover:underline font-semibold"
            >
              Синхронизировать свежие партии с Lichess.org →
            </button>
          </div>
        </section>
      </div>

      {/* Row 2: Opening Repertoire Matrix (ECO) with Blind Spots */}
      <section className="rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2E]">
          <div>
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Интерактивный трекер дебютов (Opening Repertoire Matrix)
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Сегментированные прогресс-бары Win / Draw / Loss по кодам ECO и диагностика дебютных «слепых зон»
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#2A2A2E]">
              {(
                [
                  { id: 'all', label: 'Все цвета' },
                  { id: 'white', label: 'За белых' },
                  { id: 'black', label: 'За черных' },
                ] as const
              ).map((side) => (
                <button
                  key={side.id}
                  type="button"
                  onClick={() => {
                    triggerFlutterHaptic(
                      'HapticFeedback.selectionClick()',
                      `Фильтр дебютов: ${side.label}`,
                      onLogHaptic
                    );
                    setColorFilter(side.id);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    colorFilter === side.id
                      ? 'bg-[#D97706] text-[#121212] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  {side.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerFlutterHaptic(
                  'HapticFeedback.lightImpact()',
                  'Фильтр «Только слепые зоны»',
                  onLogHaptic
                );
                setOnlyBlindSpots((v) => !v);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                onlyBlindSpots
                  ? 'bg-[#451A1A] border-[#EF4444] text-[#FCA5A5]'
                  : 'bg-[#121212] border-[#2A2A2E] text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              {onlyBlindSpots ? `Показаны слепые зоны (${blindSpotIds.size})` : 'Подсветить слепые зоны'}
            </button>

            <input
              type="search"
              value={ecoSearch}
              onChange={(e) => setEcoSearch(e.target.value)}
              placeholder="Поиск по ECO или названию..."
              aria-label="Поиск по ECO или названию дебюта"
              className="px-3 py-1.5 text-xs rounded-lg bg-[#121212] border border-[#2A2A2E] text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-[#D97706] w-48"
            />
          </div>
        </div>

        {filteredOpenings.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#9CA3AF]">
            Дебюты по заданному фильтру не найдены.{' '}
            <button
              type="button"
              onClick={() => {
                setColorFilter('all');
                setOnlyBlindSpots(false);
                setEcoSearch('');
              }}
              className="text-[#D97706] underline ml-1"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2E] mt-2">
            {filteredOpenings.map((op) => {
              const wdl = computeWinDrawLossPercentages(op.wins, op.draws, op.losses);
              const isBlindSpot = blindSpotIds.has(op.id);

              return (
                <div
                  key={op.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono font-bold text-[#D97706]">
                        {op.eco}
                      </span>
                      <span aria-hidden="true" className="text-[#6B7280]">·</span>
                      <span className="font-semibold text-[#F3F4F6]">
                        {op.nameRu}
                      </span>
                      <span aria-hidden="true" className="text-[#6B7280]">·</span>
                      <span className="text-[#9CA3AF] text-xs">
                        {op.variationRu}
                      </span>
                      <span aria-hidden="true" className="text-[#6B7280]">·</span>
                      <span className="text-xs font-mono text-[#9CA3AF]">
                        {op.side === 'white' ? 'Белые' : 'Черные'} ({wdl.totalGames} парт.)
                      </span>
                    </div>

                    {/* Segmented Win / Draw / Loss Bar */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-2.5 rounded overflow-hidden flex bg-[#121212]"
                        aria-label={`Винрейт ${wdl.winPct}% побед, ${wdl.drawPct}% ничьих, ${wdl.lossPct}% поражений`}
                      >
                        <div
                          style={{ width: `${wdl.winPct}%` }}
                          className="bg-[#10B981] transition-all duration-300"
                        />
                        <div
                          style={{ width: `${wdl.drawPct}%` }}
                          className="bg-[#6B7280] transition-all duration-300"
                        />
                        <div
                          style={{ width: `${wdl.lossPct}%` }}
                          className="bg-[#EF4444] transition-all duration-300"
                        />
                      </div>

                      <div className="text-xs font-mono tabular-nums text-[#9CA3AF] shrink-0">
                        <span className="text-[#10B981] font-semibold">{wdl.winPct}% W</span>
                        {' / '}
                        <span>{wdl.drawPct}% D</span>
                        {' / '}
                        <span className="text-[#EF4444] font-semibold">{wdl.lossPct}% L</span>
                      </div>
                    </div>

                    <div className="text-xs text-[#9CA3AF] flex flex-wrap items-center gap-2 pt-0.5">
                      <span
                        className={
                          isBlindSpot
                            ? 'text-[#FCA5A5] font-medium'
                            : 'text-[#9CA3AF]'
                        }
                      >
                        {op.blindSpotReasonRu}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Крит. ход: {op.criticalMoveSan} (ср. потеря -{op.avgEvalDropCp} cp · {op.avgMoveTimeSec}с/ход · Лучше: {op.bestReplySan})
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        triggerFlutterHaptic(
                          'HapticFeedback.mediumImpact()',
                          `Переход к позиции ${op.eco} на доске`,
                          onLogHaptic
                        );
                        onInspectOpeningOnBoard(op);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#121212] hover:bg-[#27272A] border border-[#2E2E32] text-xs font-semibold text-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
                    >
                      Разбор позиции на доске →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Row 3: Time Spent Heatmap + Tactical Mistake Patterns ("Мои частые ошибки") */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Time Spent Heatmap */}
        <section className="lg:col-span-6 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Временной менеджмент (Time Spent Heatmap)
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Выявление «ступора» (Deep Think ≥ 18с) и импульсивных ходов в цейтноте (≤ 2.2с при остатке &lt; 25с)
            </p>

            {/* Bar Heatmap by Move Number */}
            <div className="mt-5 grid grid-cols-10 gap-2 items-end h-36 pt-4 px-2 rounded-lg bg-[#121212] border border-[#262629]">
              {timeBuckets.map((b) => {
                const anomaly = classifyMoveTimeAnomaly(
                  b.avgSecondsSpent,
                  b.remainingClockSec
                );
                const heightPct = Math.min(100, Math.max(14, (b.avgSecondsSpent / 30) * 100));
                const barColor =
                  anomaly === 'deep_think'
                    ? 'bg-[#D97706]'
                    : anomaly === 'impulse_zeitnot'
                      ? 'bg-[#EF4444]'
                      : 'bg-[#10B981]';

                return (
                  <div
                    key={b.moveNumber}
                    className="flex flex-col items-center justify-end h-full group"
                    title={`Ход ${b.moveNumber} (${b.sampleSan}): ${b.avgSecondsSpent}с · Точность ${b.accuracyPct}%`}
                  >
                    <span className="text-[10px] font-mono tabular-nums text-[#9CA3AF] mb-1">
                      {b.avgSecondsSpent}с
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all ${barColor}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#9CA3AF] mt-1.5 pb-1">
                      Х{b.moveNumber}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#9CA3AF] mt-3">
              <span>Оптимальный темп (Зеленый)</span>
              <span>·</span>
              <span className="text-[#FDE68A]">Ступор / Deep Think ≥ 18с (Янтарный)</span>
              <span>·</span>
              <span className="text-[#FCA5A5]">Импульс в цейтноте ≤ 2.2с (Красный)</span>
            </div>
          </div>

          {/* Stage Pace vs Accuracy Table */}
          <div className="mt-5 pt-4 border-t border-[#2A2A2E] space-y-2.5">
            <div className="text-xs font-semibold text-[#F3F4F6]">
              Соотношение среднего темпа игры к проценту точности по стадиям:
            </div>
            {stageSummary.map((st) => (
              <div
                key={st.stage}
                className="flex items-center justify-between text-xs py-1.5 border-b border-[#262629] last:border-none"
              >
                <span className="text-[#F3F4F6] font-medium">{st.labelRu}</span>
                <span className="font-mono tabular-nums text-[#9CA3AF]">
                  {st.avgSecPerMove.toFixed(1)} сек/ход · Точность{' '}
                  <strong className="text-[#10B981]">{st.accuracyPct.toFixed(1)}%</strong> · Зевков:{' '}
                  {st.blundersPer100Moves}/100
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tactical Mistake Patterns & Generated Personal Puzzles */}
        <section className="lg:col-span-6 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Паттерны тактических ошибок · «Мои частые ошибки»
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Автоматическая категоризация зевков из ваших партий и генерация персональных задач
            </p>

            <div className="divide-y divide-[#2A2A2E] mt-3">
              {mistakePatterns.map((pat) => (
                <div
                  key={pat.motif}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F3F4F6]">
                      {pat.titleRu}
                    </div>
                    <div className="text-xs text-[#9CA3AF] truncate">
                      {pat.descriptionRu}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className="text-xs font-bold text-[#EF4444]">
                      {pat.occurrencesLast30Days} зевков
                    </div>
                    <div className="text-[11px] text-[#9CA3AF]">
                      ср. -{pat.avgCentipawnLoss} cp
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#2A2A2E]">
            <div className="text-xs font-semibold text-[#F3F4F6] mb-2.5">
              Сгенерированные задачи по вашим партиям ({personalPuzzles.length}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {personalPuzzles.slice(0, 2).map((puz) => (
                <div
                  key={puz.id}
                  className="p-3 rounded-lg bg-[#121212] border border-[#2A2A2E] flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#F3F4F6]">
                      {puz.motifLabelRu} · vs {puz.gameOpponent}
                    </div>
                    <div className="text-[11px] font-mono text-[#9CA3AF] mt-0.5">
                      Ваш ход в партии: <span className="text-[#EF4444]">{puz.blunderMovePlayedSan}</span> ({puz.evalBefore} → {puz.evalAfter})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerFlutterHaptic(
                        'HapticFeedback.mediumImpact()',
                        `Запуск персональной задачи ${puz.motifLabelRu}`,
                        onLogHaptic
                      );
                      onStartPersonalPuzzle(puz);
                    }}
                    className="w-full py-1.5 px-3 rounded bg-[#D97706] hover:bg-[#B45309] text-[#121212] font-semibold text-xs transition-colors whitespace-nowrap"
                  >
                    Решить задачу в тренажере →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
