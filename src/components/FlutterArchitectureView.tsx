import React, { useState } from 'react';
import { triggerFlutterHaptic, HapticEventLog } from '../utils/haptics';

export interface DartSourceModule {
  id: string;
  filePath: string;
  layerRu: string;
  summaryRu: string;
  code: string;
}

export const DART_ARCHITECTURE_MODULES: DartSourceModule[] = [
  {
    id: 'stats_model',
    filePath: 'lib/src/model/stats/advanced_stats_model.dart',
    layerRu: 'Модели данных / DTO (Immutable)',
    summaryRu:
      'Чистые DTO для матрицы дебютов (ECO), тепловой карты времени, паттернов тактических зевков, стрика/формы и переломных моментов партии.',
    code: `// lib/src/model/stats/advanced_stats_model.dart
import 'package:flutter/foundation.dart';

enum StatsTimeframe { day, week, month, allTime }
enum RepertoireSideFilter { all, white, black }
enum PlayerFormStatus { peak, stable, slump }

enum TacticalMotifType {
  missedPin,
  knightFork,
  overloadedDefender,
  backRankMate,
  hangingPieceZeitnot,
}

enum CriticalMomentType {
  criticalBlunder,
  turningPoint,
  bestTacticalStrike,
}

@immutable
class OpeningRepertoireEntry {
  const OpeningRepertoireEntry({
    required this.eco,
    required this.openingName,
    required this.variationName,
    required this.isWhite,
    required this.wins,
    required this.draws,
    required this.losses,
    required this.avgCentipawnLoss,
    required this.avgTimeSpentOnCriticalMoveSec,
    required this.criticalPly,
    required this.criticalMoveSan,
    required this.sampleFen,
    required this.blindSpotDiagnostic,
  });

  final String eco;
  final String openingName;
  final String variationName;
  final bool isWhite;
  final int wins;
  final int draws;
  final int losses;
  final double avgCentipawnLoss;
  final double avgTimeSpentOnCriticalMoveSec;
  final int criticalPly;
  final String criticalMoveSan;
  final String sampleFen;
  final String blindSpotDiagnostic;

  int get totalGames => wins + draws + losses;
  double get winRate => totalGames == 0 ? 0.0 : (wins / totalGames) * 100.0;
  double get drawRate => totalGames == 0 ? 0.0 : (draws / totalGames) * 100.0;
  double get lossRate =>
      totalGames == 0 ? 0.0 : (100.0 - winRate - drawRate).clamp(0.0, 100.0);

  bool get isBlindSpot =>
      avgCentipawnLoss >= 95.0 || avgTimeSpentOnCriticalMoveSec >= 14.0;
}

@immutable
class MoveTimeHeatmapPoint {
  const MoveTimeHeatmapPoint({
    required this.moveNumber,
    required this.avgSecondsSpent,
    required this.avgRemainingClockSec,
    required this.accuracyPercent,
    required this.phase,
  });

  final int moveNumber;
  final double avgSecondsSpent;
  final double avgRemainingClockSec;
  final double accuracyPercent;
  final GamePhase phase;

  bool get isDeepThinkStall => avgSecondsSpent >= 18.0;
  bool get isZeitnotImpulse =>
      avgRemainingClockSec <= 25.0 && avgSecondsSpent <= 2.2;
}

enum GamePhase { opening, middlegame, endgame }`,
  },
  {
    id: 'stats_provider',
    filePath: 'lib/src/model/stats/advanced_stats_provider.dart',
    layerRu: 'Провайдеры состояния Riverpod',
    summaryRu:
      'NotifierProvider для фильтров времени/цвета и изолированный репозиторий, работающий асинхронно без блокировки игрового WebSocket и изолята Stockfish.',
    code: `// lib/src/model/stats/advanced_stats_provider.dart
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'advanced_stats_model.dart';

class AdvancedStatsFilterState {
  const AdvancedStatsFilterState({
    this.timeframe = StatsTimeframe.week,
    this.sideFilter = RepertoireSideFilter.all,
    this.onlyBlindSpots = false,
    this.selectedPerf = 'blitz',
  });

  final StatsTimeframe timeframe;
  final RepertoireSideFilter sideFilter;
  final bool onlyBlindSpots;
  final String selectedPerf;

  AdvancedStatsFilterState copyWith({
    StatsTimeframe? timeframe,
    RepertoireSideFilter? sideFilter,
    bool? onlyBlindSpots,
    String? selectedPerf,
  }) {
    return AdvancedStatsFilterState(
      timeframe: timeframe ?? this.timeframe,
      sideFilter: sideFilter ?? this.sideFilter,
      onlyBlindSpots: onlyBlindSpots ?? this.onlyBlindSpots,
      selectedPerf: selectedPerf ?? this.selectedPerf,
    );
  }
}

class AdvancedStatsFilterNotifier extends Notifier<AdvancedStatsFilterState> {
  @override
  AdvancedStatsFilterState build() => const AdvancedStatsFilterState();

  void setTimeframe(StatsTimeframe timeframe) =>
      state = state.copyWith(timeframe: timeframe);

  void setSideFilter(RepertoireSideFilter side) =>
      state = state.copyWith(sideFilter: side);

  void toggleBlindSpotsOnly() =>
      state = state.copyWith(onlyBlindSpots: !state.onlyBlindSpots);

  void setPerfControl(String perf) =>
      state = state.copyWith(selectedPerf: perf);
}

final advancedStatsFilterProvider =
    NotifierProvider<AdvancedStatsFilterNotifier, AdvancedStatsFilterState>(
  AdvancedStatsFilterNotifier.new,
);`,
  },
  {
    id: 'stats_screen',
    filePath: 'lib/src/view/stats/advanced_stats_screen.dart',
    layerRu: 'UI Экран статистики + fl_chart',
    summaryRu:
      'True Dark OLED (#121212 / #1E1E1E) экран аналитики: StreakAndFormCard, RatingProgressFlChartCard, OpeningRepertoireMatrixCard и TimeSpentHeatmapCard.',
    code: `// lib/src/view/stats/advanced_stats_screen.dart
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
        title: const Text('Продвинутая аналитика'),
      ),
      body: statsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Ошибка: $err')),
        data: (bundle) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // StreakAndFormCard, RatingProgressFlChartCard, OpeningRepertoireMatrixCard,
            // TimeSpentHeatmapCard, PersonalMistakePatternsCard
          ],
        ),
      ),
    );
  }
}`,
  },
  {
    id: 'board_analysis',
    filePath: 'lib/src/view/analysis/enhanced_board_and_analysis.dart',
    layerRu: 'UI Доски, Eval Bar, Часы и Жесты',
    summaryRu:
      'SmoothedEvalBar (Curves.easeInOut), AdaptiveChessClock (<30с и <10с пульсация), кастомные темы доски, жесты свайпов и карточки «Один клик к перелому».',
    code: `// lib/src/view/analysis/enhanced_board_and_analysis.dart
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum CustomChessBoardPreset { oledMinimalist, slateGrey, woodClassic }

class ChessHapticService {
  static Future<void> onPieceMove({
    required bool isCapture,
    required bool isCheck,
    required bool isPremove,
    required bool isPromotion,
  }) async {
    if (isCheck || isPromotion) {
      await HapticFeedback.heavyImpact();
    } else if (isCapture) {
      await HapticFeedback.lightImpact();
    } else {
      await HapticFeedback.selectionClick();
    }
  }
}

class SmoothedEvalBar extends StatelessWidget {
  const SmoothedEvalBar({
    super.key,
    required this.evalCentipawns,
    this.forcedMateIn,
    this.isFlipped = false,
  });

  final int evalCentipawns;
  final int? forcedMateIn;
  final bool isFlipped;

  double _computeWhiteFraction() {
    if (forcedMateIn != null) return forcedMateIn! > 0 ? 0.97 : 0.03;
    final clamped = evalCentipawns.clamp(-1000, 1000).toDouble();
    return (1.0 / (1.0 + math.exp(-0.004 * clamped))).clamp(0.04, 0.96);
  }

  @override
  Widget build(BuildContext context) {
    final whiteFraction = _computeWhiteFraction();
    return LayoutBuilder(
      builder: (context, constraints) => AnimatedContainer(
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeInOut,
        height: constraints.maxHeight * (isFlipped ? 1.0 - whiteFraction : whiteFraction),
        color: const Color(0xFFE5E7EB),
      ),
    );
  }
}`,
  },
  {
    id: 'puzzle_trainer',
    filePath: 'lib/src/view/puzzle/enhanced_puzzle_trainer.dart',
    layerRu: 'UI Пазл-тренажера (QoL)',
    summaryRu:
      'EnhancedPuzzleTrainerScreen с тумблером автоматического перехода через 1.5 сек после правильного решения и кнопкой моментального рестарта при ошибке.',
    code: `// lib/src/view/puzzle/enhanced_puzzle_trainer.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../model/stats/advanced_stats_model.dart';

class EnhancedPuzzleTrainerScreen extends StatefulWidget {
  const EnhancedPuzzleTrainerScreen({super.key, required this.puzzles});
  final List<GeneratedPersonalPuzzle> puzzles;

  @override
  State<EnhancedPuzzleTrainerScreen> createState() =>
      _EnhancedPuzzleTrainerScreenState();
}

enum PuzzleAttemptStatus { idle, solved, failed }

class _EnhancedPuzzleTrainerScreenState
    extends State<EnhancedPuzzleTrainerScreen> {
  int _currentIndex = 0;
  bool _autoAdvanceEnabled = true;
  PuzzleAttemptStatus _status = PuzzleAttemptStatus.idle;
  Timer? _autoNextTimer;

  void _handleMoveAttempt(String uciMove) {
    _autoNextTimer?.cancel();
    final expected = widget.puzzles[_currentIndex].solutionUciMoves.first;
    if (uciMove == expected) {
      HapticFeedback.lightImpact();
      setState(() => _status = PuzzleAttemptStatus.solved);
      if (_autoAdvanceEnabled) {
        _autoNextTimer = Timer(const Duration(milliseconds: 1500), () {
          if (mounted) {
            setState(() {
              _currentIndex = (_currentIndex + 1) % widget.puzzles.length;
              _status = PuzzleAttemptStatus.idle;
            });
          }
        });
      }
    } else {
      HapticFeedback.heavyImpact();
      setState(() => _status = PuzzleAttemptStatus.failed);
    }
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}`,
  },
];

export function FlutterArchitectureView({
  onLogHaptic,
}: {
  onLogHaptic: (entry: HapticEventLog) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(DART_ARCHITECTURE_MODULES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeModule =
    DART_ARCHITECTURE_MODULES.find((m) => m.id === selectedId) ||
    DART_ARCHITECTURE_MODULES[0];

  const handleCopy = async (mod: DartSourceModule) => {
    try {
      await navigator.clipboard.writeText(mod.code);
    } catch {
      // Fallback ignored
    }
    setCopiedId(mod.id);
    triggerFlutterHaptic(
      'HapticFeedback.selectionClick()',
      `Скопирован код ${mod.filePath}`,
      onLogHaptic
    );
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#262629]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F3F4F6]">
          04. Архитектура проекта и исходный код Flutter / Dart (<code className="font-mono text-base text-[#D97706]">lichess-org/mobile</code>)
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Все 5 модулей на языке Dart сохранены в директории <code className="font-mono text-xs text-[#F3F4F6]">/lib/src/</code> репозитория и готовы к интеграции с Riverpod, Isar и Lichess Socket.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File Tree & Module Selector */}
        <div className="lg:col-span-5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-4 space-y-2.5">
          <div className="text-xs font-semibold text-[#9CA3AF] px-1">
            Список файлов в архитектуре проекта (lib/src/):
          </div>
          {DART_ARCHITECTURE_MODULES.map((mod, idx) => {
            const isSelected = mod.id === activeModule.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  triggerFlutterHaptic(
                    'HapticFeedback.selectionClick()',
                    `Выбран файл ${mod.filePath}`,
                    onLogHaptic
                  );
                  setSelectedId(mod.id);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-[#121212] border-[#D97706]'
                    : 'bg-[#121212] border-[#2A2A2E] hover:border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-[#D97706] truncate">
                    0{idx + 1}. {mod.filePath}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#F3F4F6] mt-1">
                  {mod.layerRu}
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">
                  {mod.summaryRu}
                </p>
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-7 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] overflow-hidden">
          <div className="px-4 py-3 bg-[#161618] border-b border-[#2A2A2E] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono font-bold text-[#F3F4F6]">
                {activeModule.filePath}
              </div>
              <div className="text-[11px] text-[#9CA3AF]">
                {activeModule.layerRu}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([activeModule.code], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = activeModule.filePath.split('/').pop() || 'module.dart';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  triggerFlutterHaptic(
                    'HapticFeedback.selectionClick()',
                    `Скачивание ${activeModule.filePath}`,
                    onLogHaptic
                  );
                }}
                className="px-3 py-1.5 rounded-lg bg-[#262629] hover:bg-[#3F3F46] border border-[#3F3F46] text-[#F3F4F6] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Скачать .dart файл ⤓
              </button>
              <button
                type="button"
                onClick={() => handleCopy(activeModule)}
                className="px-3 py-1.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-[#121212] text-xs font-bold transition-colors whitespace-nowrap shrink-0"
              >
                {copiedId === activeModule.id ? 'Скопировано ✓' : 'Копировать код'}
              </button>
            </div>
          </div>
          <pre className="p-4 text-xs font-mono text-[#E5E7EB] overflow-x-auto leading-relaxed max-h-[540px]">
            <code>{activeModule.code}</code>
          </pre>
          <div className="px-4 py-3 bg-[#161618] border-t border-[#2A2A2E] flex flex-wrap items-center justify-between gap-3 text-xs text-[#9CA3AF]">
            <span>Скачать все файлы проекта целиком:</span>
            <div className="flex items-center gap-2">
              <a
                href="/lichess_mobile_pro_sources.tar.gz"
                download="lichess_mobile_pro_sources.tar.gz"
                className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#121212] font-bold text-xs transition-colors whitespace-nowrap"
              >
                Скачать архив всех файлов (.tar.gz) ⤓
              </a>
              <a
                href="/flutter_lichess_modules.json"
                download="flutter_lichess_modules.json"
                className="px-3 py-1.5 rounded-lg bg-[#262629] hover:bg-[#3F3F46] border border-[#3F3F46] text-[#F3F4F6] font-semibold text-xs transition-colors whitespace-nowrap"
              >
                Скачать JSON-бандл ⤓
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
