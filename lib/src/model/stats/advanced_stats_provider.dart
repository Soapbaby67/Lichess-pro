// lib/src/model/stats/advanced_stats_provider.dart
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'advanced_stats_model.dart';

/// Filter state for the Advanced Stats screen.
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

  void setTimeframe(StatsTimeframe timeframe) {
    state = state.copyWith(timeframe: timeframe);
  }

  void setSideFilter(RepertoireSideFilter side) {
    state = state.copyWith(sideFilter: side);
  }

  void toggleBlindSpotsOnly() {
    state = state.copyWith(onlyBlindSpots: !state.onlyBlindSpots);
  }

  void setPerfControl(String perf) {
    state = state.copyWith(selectedPerf: perf);
  }
}

final advancedStatsFilterProvider =
    NotifierProvider<AdvancedStatsFilterNotifier, AdvancedStatsFilterState>(
  AdvancedStatsFilterNotifier.new,
);

/// Repository interface decoupled from UI so Isar/SQLite local DB or Lichess HTTP client can be injected.
abstract class AdvancedStatsRepository {
  Future<AdvancedPlayerStatsBundle> fetchPlayerInsights({
    required String perf,
    required StatsTimeframe timeframe,
  });
}

class LocalAndApiStatsRepository implements AdvancedStatsRepository {
  const LocalAndApiStatsRepository();

  @override
  Future<AdvancedPlayerStatsBundle> fetchPlayerInsights({
    required String perf,
    required StatsTimeframe timeframe,
  }) async {
    // Runs asynchronously off the WebSocket game loop so live matches & Stockfish isolate are untouched.
    await Future<void>.delayed(const Duration(milliseconds: 120));

    final now = DateTime.now();
    return AdvancedPlayerStatsBundle(
      streakAndForm: const StreakAndFormSummary(
        currentWinStreak: 7,
        seasonBestStreak: 12,
        last10GamesAccuracy: 91.4,
        formStatus: PlayerFormStatus.peak,
        ratingDeltaLast10: 46,
      ),
      ratingSeries: List<RatingHistorySample>.generate(
        7,
        (i) => RatingHistorySample(
          timestamp: now.subtract(Duration(days: 6 - i)),
          rating: 2088 + (i * 11),
          accuracy: 86.5 + (i * 1.2),
        ),
      ),
      openingRepertoire: const [
        OpeningRepertoireEntry(
          eco: 'B90',
          openingName: 'Сицилианская защита',
          variationName: 'Вариант Найдорфа, 6. Be3 e5',
          isWhite: true,
          wins: 19,
          draws: 5,
          losses: 18,
          avgCentipawnLoss: 142.0,
          avgTimeSpentOnCriticalMoveSec: 18.6,
          criticalPly: 15,
          criticalMoveSan: '8. Bc4?!',
          sampleFen:
              'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 2 6',
          blindSpotDiagnostic:
              'Слепая зона на 8-м ходу: задержка 18.6с и потеря темпа вместо 8. f3.',
        ),
        OpeningRepertoireEntry(
          eco: 'C65',
          openingName: 'Испанская партия',
          variationName: 'Берлинская защита, 4. d3 Bc5',
          isWhite: true,
          wins: 38,
          draws: 11,
          losses: 9,
          avgCentipawnLoss: 34.0,
          avgTimeSpentOnCriticalMoveSec: 6.2,
          criticalPly: 18,
          criticalMoveSan: '9. Nbd2',
          sampleFen:
              'r1bqk2r/pppp1ppp/2n2n2/2b1p3/1PB1P3/3P1N2/P1P2PPP/RNBQK2R b KQkq - 0 5',
          blindSpotDiagnostic: 'Эталонный темп и высокая точность маневра коня.',
        ),
        OpeningRepertoireEntry(
          eco: 'E60',
          openingName: 'Староиндийская защита',
          variationName: 'Классическая система, 7...Nc6 8. d5',
          isWhite: false,
          wins: 14,
          draws: 4,
          losses: 19,
          avgCentipawnLoss: 168.0,
          avgTimeSpentOnCriticalMoveSec: 21.4,
          criticalPly: 18,
          criticalMoveSan: '9...Nd4??',
          sampleFen:
              'r1bq1rk1/ppp1ppbp/2np1np1/3P4/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8',
          blindSpotDiagnostic:
              'Критическая слепая зона: прыжок 9...Nd4 ведет к потере пешки.',
        ),
      ],
      timeHeatmap: const [
        MoveTimeHeatmapPoint(
          moveNumber: 4,
          avgSecondsSpent: 2.1,
          avgRemainingClockSec: 175,
          accuracyPercent: 98.2,
          phase: GamePhase.opening,
        ),
        MoveTimeHeatmapPoint(
          moveNumber: 8,
          avgSecondsSpent: 19.4,
          avgRemainingClockSec: 148,
          accuracyPercent: 76.5,
          phase: GamePhase.opening,
        ),
        MoveTimeHeatmapPoint(
          moveNumber: 16,
          avgSecondsSpent: 24.6,
          avgRemainingClockSec: 94,
          accuracyPercent: 71.4,
          phase: GamePhase.middlegame,
        ),
        MoveTimeHeatmapPoint(
          moveNumber: 24,
          avgSecondsSpent: 28.5,
          avgRemainingClockSec: 41,
          accuracyPercent: 68.0,
          phase: GamePhase.middlegame,
        ),
        MoveTimeHeatmapPoint(
          moveNumber: 32,
          avgSecondsSpent: 1.4,
          avgRemainingClockSec: 19,
          accuracyPercent: 64.2,
          phase: GamePhase.endgame,
        ),
      ],
      phaseStats: const [
        PhaseAccuracyPaceStat(
          phase: GamePhase.opening,
          avgSecondsPerMove: 6.4,
          accuracyPercent: 92.8,
          blundersPer100Moves: 1.2,
        ),
        PhaseAccuracyPaceStat(
          phase: GamePhase.middlegame,
          avgSecondsPerMove: 15.8,
          accuracyPercent: 84.3,
          blundersPer100Moves: 4.7,
        ),
        PhaseAccuracyPaceStat(
          phase: GamePhase.endgame,
          avgSecondsPerMove: 2.3,
          accuracyPercent: 78.6,
          blundersPer100Moves: 7.4,
        ),
      ],
      mistakePatterns: const [
        TacticalMistakePattern(
          motif: TacticalMotifType.missedPin,
          title: 'Пропущенная связка',
          subtitle: 'Игнорирование диагонального рентгена слона на f6 / c6.',
          countLast30Days: 14,
          avgEvalLossCp: 245,
        ),
        TacticalMistakePattern(
          motif: TacticalMotifType.knightFork,
          title: 'Коневая вилка',
          subtitle: 'Двойной удар на поля c7 и f7 в условиях цейтнота.',
          countLast30Days: 11,
          avgEvalLossCp: 310,
        ),
        TacticalMistakePattern(
          motif: TacticalMotifType.overloadedDefender,
          title: 'Перегрузка защитника',
          subtitle: 'Отвлечение единственного защитника опорного пункта.',
          countLast30Days: 8,
          avgEvalLossCp: 190,
        ),
      ],
      personalPuzzles: const [
        GeneratedPersonalPuzzle(
          puzzleId: 'puz-pin-01',
          sourceGameId: 'lic-99812a',
          motif: TacticalMotifType.missedPin,
          initialFen:
              'r1bqk2r/ppp2ppp/2np1n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6',
          solutionUciMoves: ['c1g5'],
          blunderPlayedSan: '6. Ng5?!',
          opponentHandle: 'NordicKnight (2135)',
          evalSwingLabel: '+0.2 → +1.6',
        ),
      ],
    );
  }
}

final advancedStatsRepositoryProvider = Provider<AdvancedStatsRepository>((ref) {
  return const LocalAndApiStatsRepository();
});

final advancedStatsBundleProvider =
    FutureProvider.autoDispose<AdvancedPlayerStatsBundle>((ref) async {
  final filter = ref.watch(advancedStatsFilterProvider);
  final repo = ref.watch(advancedStatsRepositoryProvider);
  return repo.fetchPlayerInsights(
    perf: filter.selectedPerf,
    timeframe: filter.timeframe,
  );
});

final filteredOpeningRepertoireProvider =
    Provider.autoDispose<AsyncValue<List<OpeningRepertoireEntry>>>((ref) {
  final bundleAsync = ref.watch(advancedStatsBundleProvider);
  final filter = ref.watch(advancedStatsFilterProvider);

  return bundleAsync.whenData((bundle) {
    return bundle.openingRepertoire.where((entry) {
      final matchesSide = switch (filter.sideFilter) {
        RepertoireSideFilter.all => true,
        RepertoireSideFilter.white => entry.isWhite,
        RepertoireSideFilter.black => !entry.isWhite,
      };
      final matchesBlindSpot = !filter.onlyBlindSpots || entry.isBlindSpot;
      return matchesSide && matchesBlindSpot;
    }).toList();
  });
});
