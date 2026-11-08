// lib/src/model/stats/advanced_stats_model.dart
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

  /// Identifies whether this opening is a "Blind Spot" based on early mistakes or deep-think stalls.
  bool get isBlindSpot =>
      avgCentipawnLoss >= 95.0 || avgTimeSpentOnCriticalMoveSec >= 14.0;

  factory OpeningRepertoireEntry.fromJson(Map<String, dynamic> json) {
    return OpeningRepertoireEntry(
      eco: json['eco'] as String,
      openingName: json['openingName'] as String,
      variationName: json['variationName'] as String,
      isWhite: json['isWhite'] as bool,
      wins: json['wins'] as int,
      draws: json['draws'] as int,
      losses: json['losses'] as int,
      avgCentipawnLoss: (json['avgCentipawnLoss'] as num).toDouble(),
      avgTimeSpentOnCriticalMoveSec:
          (json['avgTimeSpentOnCriticalMoveSec'] as num).toDouble(),
      criticalPly: json['criticalPly'] as int,
      criticalMoveSan: json['criticalMoveSan'] as String,
      sampleFen: json['sampleFen'] as String,
      blindSpotDiagnostic: json['blindSpotDiagnostic'] as String,
    );
  }
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

enum GamePhase { opening, middlegame, endgame }

@immutable
class PhaseAccuracyPaceStat {
  const PhaseAccuracyPaceStat({
    required this.phase,
    required this.avgSecondsPerMove,
    required this.accuracyPercent,
    required this.blundersPer100Moves,
  });

  final GamePhase phase;
  final double avgSecondsPerMove;
  final double accuracyPercent;
  final double blundersPer100Moves;
}

@immutable
class TacticalMistakePattern {
  const TacticalMistakePattern({
    required this.motif,
    required this.title,
    required this.subtitle,
    required this.countLast30Days,
    required this.avgEvalLossCp,
  });

  final TacticalMotifType motif;
  final String title;
  final String subtitle;
  final int countLast30Days;
  final int avgEvalLossCp;
}

@immutable
class GeneratedPersonalPuzzle {
  const GeneratedPersonalPuzzle({
    required this.puzzleId,
    required this.sourceGameId,
    required this.motif,
    required this.initialFen,
    required this.solutionUciMoves,
    required this.blunderPlayedSan,
    required this.opponentHandle,
    required this.evalSwingLabel,
  });

  final String puzzleId;
  final String sourceGameId;
  final TacticalMotifType motif;
  final String initialFen;
  final List<String> solutionUciMoves;
  final String blunderPlayedSan;
  final String opponentHandle;
  final String evalSwingLabel;
}

@immutable
class RatingHistorySample {
  const RatingHistorySample({
    required this.timestamp,
    required this.rating,
    required this.accuracy,
  });

  final DateTime timestamp;
  final int rating;
  final double accuracy;
}

@immutable
class StreakAndFormSummary {
  const StreakAndFormSummary({
    required this.currentWinStreak,
    required this.seasonBestStreak,
    required this.last10GamesAccuracy,
    required this.formStatus,
    required this.ratingDeltaLast10,
  });

  final int currentWinStreak;
  final int seasonBestStreak;
  final double last10GamesAccuracy;
  final PlayerFormStatus formStatus;
  final int ratingDeltaLast10;
}

@immutable
class CriticalGameMoment {
  const CriticalGameMoment({
    required this.type,
    required this.ply,
    required this.moveSan,
    required this.fenAtPosition,
    required this.evalBeforeCp,
    required this.evalAfterCp,
    required this.bestEngineMoveSan,
    required this.description,
  });

  final CriticalMomentType type;
  final int ply;
  final String moveSan;
  final String fenAtPosition;
  final int evalBeforeCp;
  final int evalAfterCp;
  final String bestEngineMoveSan;
  final String description;
}

@immutable
class AdvancedPlayerStatsBundle {
  const AdvancedPlayerStatsBundle({
    required this.streakAndForm,
    required this.ratingSeries,
    required this.openingRepertoire,
    required this.timeHeatmap,
    required this.phaseStats,
    required this.mistakePatterns,
    required this.personalPuzzles,
  });

  final StreakAndFormSummary streakAndForm;
  final List<RatingHistorySample> ratingSeries;
  final List<OpeningRepertoireEntry> openingRepertoire;
  final List<MoveTimeHeatmapPoint> timeHeatmap;
  final List<PhaseAccuracyPaceStat> phaseStats;
  final List<TacticalMistakePattern> mistakePatterns;
  final List<GeneratedPersonalPuzzle> personalPuzzles;
}
