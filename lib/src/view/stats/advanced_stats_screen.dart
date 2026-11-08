// lib/src/view/stats/advanced_stats_screen.dart
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../model/stats/advanced_stats_model.dart';
import '../../model/stats/advanced_stats_provider.dart';

class OledPalette {
  static const Color canvas = Color(0xFF121212);
  static const Color surface = Color(0xFF1E1E1E);
  static const Color border = Color(0xFF2C2C2C);
  static const Color textPrimary = Color(0xFFF3F4F6);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color winGreen = Color(0xFF10B981);
  static const Color drawGrey = Color(0xFF6B7280);
  static const Color lossRed = Color(0xFFEF4444);
  static const Color amberAccent = Color(0xFFD97706);
}

class AdvancedStatsScreen extends ConsumerWidget {
  const AdvancedStatsScreen({
    super.key,
    required this.onInspectPositionOnBoard,
    required this.onOpenPersonalPuzzle,
  });

  final void Function(String fen, String label) onInspectPositionOnBoard;
  final void Function(GeneratedPersonalPuzzle puzzle) onOpenPersonalPuzzle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(advancedStatsFilterProvider);
    final statsAsync = ref.watch(advancedStatsBundleProvider);
    final repertoireAsync = ref.watch(filteredOpeningRepertoireProvider);

    return Scaffold(
      backgroundColor: OledPalette.canvas,
      appBar: AppBar(
        backgroundColor: OledPalette.canvas,
        elevation: 0,
        title: const Text(
          'Продвинутая аналитика',
          style: TextStyle(
            color: OledPalette.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'bullet', label: Text('Bullet')),
                ButtonSegment(value: 'blitz', label: Text('Blitz')),
                ButtonSegment(value: 'rapid', label: Text('Rapid')),
              ],
              selected: {filter.selectedPerf},
              onSelectionChanged: (selection) {
                HapticFeedback.selectionClick();
                ref
                    .read(advancedStatsFilterProvider.notifier)
                    .setPerfControl(selection.first);
              },
            ),
          ),
        ],
      ),
      body: statsAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: OledPalette.amberAccent),
        ),
        error: (err, _) => Center(
          child: Text(
            'Ошибка загрузки статистики: $err',
            style: const TextStyle(color: OledPalette.lossRed),
          ),
        ),
        data: (bundle) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              StreakAndFormCard(summary: bundle.streakAndForm),
              const SizedBox(height: 16),
              RatingProgressFlChartCard(
                samples: bundle.ratingSeries,
                activeTimeframe: filter.timeframe,
                onTimeframeChanged: (tf) {
                  HapticFeedback.selectionClick();
                  ref
                      .read(advancedStatsFilterProvider.notifier)
                      .setTimeframe(tf);
                },
              ),
              const SizedBox(height: 16),
              OpeningRepertoireMatrixCard(
                entries: repertoireAsync.valueOrNull ?? const [],
                sideFilter: filter.sideFilter,
                onlyBlindSpots: filter.onlyBlindSpots,
                onSideChanged: (side) {
                  HapticFeedback.selectionClick();
                  ref
                      .read(advancedStatsFilterProvider.notifier)
                      .setSideFilter(side);
                },
                onToggleBlindSpots: () {
                  HapticFeedback.lightImpact();
                  ref
                      .read(advancedStatsFilterProvider.notifier)
                      .toggleBlindSpotsOnly();
                },
                onTapEntry: (entry) {
                  HapticFeedback.mediumImpact();
                  onInspectPositionOnBoard(
                    entry.sampleFen,
                    '${entry.eco} ${entry.openingName}',
                  );
                },
              ),
              const SizedBox(height: 16),
              TimeSpentHeatmapCard(
                points: bundle.timeHeatmap,
                phaseStats: bundle.phaseStats,
              ),
              const SizedBox(height: 16),
              PersonalMistakePatternsCard(
                patterns: bundle.mistakePatterns,
                puzzles: bundle.personalPuzzles,
                onStartPuzzle: (puzzle) {
                  HapticFeedback.mediumImpact();
                  onOpenPersonalPuzzle(puzzle);
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

class StreakAndFormCard extends StatelessWidget {
  const StreakAndFormCard({super.key, required this.summary});

  final StreakAndFormSummary summary;

  @override
  Widget build(BuildContext context) {
    final (statusLabel, statusColor) = switch (summary.formStatus) {
      PlayerFormStatus.peak => ('ПИК ФОРМЫ', OledPalette.winGreen),
      PlayerFormStatus.stable => ('СТАБИЛЬНОСТЬ', OledPalette.amberAccent),
      PlayerFormStatus.slump => ('СПАД', OledPalette.lossRed),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: OledPalette.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: OledPalette.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _MetricColumn(
            label: 'Текущий винстрик',
            value: '${summary.currentWinStreak} побед',
            subLabel: 'Рекорд сезона: ${summary.seasonBestStreak}',
            accent: OledPalette.winGreen,
          ),
          _MetricColumn(
            label: 'Точность (10 партий)',
            value: '${summary.last10GamesAccuracy.toStringAsFixed(1)}%',
            subLabel: 'Дельта: +${summary.ratingDeltaLast10} pts',
            accent: OledPalette.textPrimary,
          ),
          _MetricColumn(
            label: 'Игровая форма',
            value: statusLabel,
            subLabel: 'Stockfish 16 NNUE',
            accent: statusColor,
          ),
        ],
      ),
    );
  }
}

class _MetricColumn extends StatelessWidget {
  const _MetricColumn({
    required this.label,
    required this.value,
    required this.subLabel,
    required this.accent,
  });

  final String label;
  final String value;
  final String subLabel;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: OledPalette.textSecondary, fontSize: 12),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: accent,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subLabel,
          style: const TextStyle(color: OledPalette.textSecondary, fontSize: 11),
        ),
      ],
    );
  }
}

class RatingProgressFlChartCard extends StatelessWidget {
  const RatingProgressFlChartCard({
    super.key,
    required this.samples,
    required this.activeTimeframe,
    required this.onTimeframeChanged,
  });

  final List<RatingHistorySample> samples;
  final StatsTimeframe activeTimeframe;
  final ValueChanged<StatsTimeframe> onTimeframeChanged;

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[
      for (int i = 0; i < samples.length; i++)
        FlSpot(i.toDouble(), samples[i].rating.toDouble()),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: OledPalette.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: OledPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Динамика рейтинга (fl_chart)',
                style: TextStyle(
                  color: OledPalette.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Wrap(
                spacing: 6,
                children: StatsTimeframe.values.map((tf) {
                  final label = switch (tf) {
                    StatsTimeframe.day => 'День',
                    StatsTimeframe.week => 'Нед',
                    StatsTimeframe.month => 'Мес',
                    StatsTimeframe.allTime => 'Все',
                  };
                  final isSelected = tf == activeTimeframe;
                  return InkWell(
                    onTap: () => onTimeframeChanged(tf),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? OledPalette.amberAccent
                            : OledPalette.canvas,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        label,
                        style: TextStyle(
                          color: isSelected
                              ? Colors.black
                              : OledPalette.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => const FlLine(
                    color: OledPalette.border,
                    strokeWidth: 1,
                  ),
                ),
                titlesData: const FlTitlesData(
                  rightTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: OledPalette.winGreen,
                    barWidth: 3,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(
                      show: true,
                      color: OledPalette.winGreen.withValues(alpha: 0.14),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class OpeningRepertoireMatrixCard extends StatelessWidget {
  const OpeningRepertoireMatrixCard({
    super.key,
    required this.entries,
    required this.sideFilter,
    required this.onlyBlindSpots,
    required this.onSideChanged,
    required this.onToggleBlindSpots,
    required this.onTapEntry,
  });

  final List<OpeningRepertoireEntry> entries;
  final RepertoireSideFilter sideFilter;
  final bool onlyBlindSpots;
  final ValueChanged<RepertoireSideFilter> onSideChanged;
  final VoidCallback onToggleBlindSpots;
  final ValueChanged<OpeningRepertoireEntry> onTapEntry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: OledPalette.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: OledPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Матрица дебютного репертуара (ECO)',
                style: TextStyle(
                  color: OledPalette.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              FilterChip(
                selected: onlyBlindSpots,
                label: const Text('Слепые зоны'),
                onSelected: (_) => onToggleBlindSpots(),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final entry in entries) ...[
            InkWell(
              onTap: () => onTapEntry(entry),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${entry.eco} · ${entry.openingName} (${entry.variationName})',
                            style: const TextStyle(
                              color: OledPalette.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Text(
                          '${entry.totalGames} парт. · -${entry.avgCentipawnLoss.toInt()} cp',
                          style: TextStyle(
                            color: entry.isBlindSpot
                                ? OledPalette.lossRed
                                : OledPalette.textSecondary,
                            fontSize: 12,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: SizedBox(
                        height: 8,
                        child: Row(
                          children: [
                            Expanded(
                              flex: (entry.winRate * 10).round().clamp(1, 1000),
                              child: Container(color: OledPalette.winGreen),
                            ),
                            Expanded(
                              flex: (entry.drawRate * 10).round().clamp(1, 1000),
                              child: Container(color: OledPalette.drawGrey),
                            ),
                            Expanded(
                              flex: (entry.lossRate * 10).round().clamp(1, 1000),
                              child: Container(color: OledPalette.lossRed),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (entry.isBlindSpot) ...[
                      const SizedBox(height: 6),
                      Text(
                        entry.blindSpotDiagnostic,
                        style: const TextStyle(
                          color: OledPalette.amberAccent,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const Divider(color: OledPalette.border, height: 1),
          ],
        ],
      ),
    );
  }
}

class TimeSpentHeatmapCard extends StatelessWidget {
  const TimeSpentHeatmapCard({
    super.key,
    required this.points,
    required this.phaseStats,
  });

  final List<MoveTimeHeatmapPoint> points;
  final List<PhaseAccuracyPaceStat> phaseStats;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: OledPalette.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: OledPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Тайм-менеджмент и точность по стадиям',
            style: TextStyle(
              color: OledPalette.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          for (final stat in phaseStats)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    stat.phase.name.toUpperCase(),
                    style: const TextStyle(
                      color: OledPalette.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    '${stat.avgSecondsPerMove.toStringAsFixed(1)} сек/ход · Точность ${stat.accuracyPercent.toStringAsFixed(1)}%',
                    style: const TextStyle(
                      color: OledPalette.textPrimary,
                      fontSize: 13,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class PersonalMistakePatternsCard extends StatelessWidget {
  const PersonalMistakePatternsCard({
    super.key,
    required this.patterns,
    required this.puzzles,
    required this.onStartPuzzle,
  });

  final List<TacticalMistakePattern> patterns;
  final List<GeneratedPersonalPuzzle> puzzles;
  final ValueChanged<GeneratedPersonalPuzzle> onStartPuzzle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: OledPalette.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: OledPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Мои частые ошибки (Паттерны зевков)',
            style: TextStyle(
              color: OledPalette.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          for (final pattern in patterns)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                pattern.title,
                style: const TextStyle(
                  color: OledPalette.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                pattern.subtitle,
                style: const TextStyle(
                  color: OledPalette.textSecondary,
                  fontSize: 12,
                ),
              ),
              trailing: Text(
                '${pattern.countLast30Days}x · -${pattern.avgEvalLossCp} cp',
                style: const TextStyle(
                  color: OledPalette.lossRed,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          if (puzzles.isNotEmpty) ...[
            const SizedBox(height: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: OledPalette.amberAccent,
                foregroundColor: Colors.black,
              ),
              onPressed: () => onStartPuzzle(puzzles.first),
              child: const Text('Отработать персонализированные задачи'),
            ),
          ],
        ],
      ),
    );
  }
}
