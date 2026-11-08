// lib/src/view/analysis/enhanced_board_and_analysis.dart
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../model/stats/advanced_stats_model.dart';

enum CustomChessBoardPreset { oledMinimalist, slateGrey, woodClassic }

@immutable
class BoardThemeColors {
  const BoardThemeColors({
    required this.lightSquare,
    required this.darkSquare,
    required this.lastMoveHighlight,
    required this.legalMoveDot,
  });

  final Color lightSquare;
  final Color darkSquare;
  final Color lastMoveHighlight;
  final Color legalMoveDot;

  static BoardThemeColors fromPreset(
    CustomChessBoardPreset preset, {
    required double legalDotOpacity,
  }) {
    final clampedOpacity = legalDotOpacity.clamp(0.15, 0.90);
    return switch (preset) {
      CustomChessBoardPreset.oledMinimalist => BoardThemeColors(
          lightSquare: const Color(0xFF2A2A2E),
          darkSquare: const Color(0xFF141416),
          lastMoveHighlight: const Color(0xFF10B981).withValues(alpha: 0.28),
          legalMoveDot: const Color(0xFF10B981).withValues(alpha: clampedOpacity),
        ),
      CustomChessBoardPreset.slateGrey => BoardThemeColors(
          lightSquare: const Color(0xFF64748B),
          darkSquare: const Color(0xFF334155),
          lastMoveHighlight: const Color(0xFFF59E0B).withValues(alpha: 0.34),
          legalMoveDot: const Color(0xFFF8FAFC).withValues(alpha: clampedOpacity),
        ),
      CustomChessBoardPreset.woodClassic => BoardThemeColors(
          lightSquare: const Color(0xFFD6B485),
          darkSquare: const Color(0xFF8B5A2B),
          lastMoveHighlight: const Color(0xFFFACC15).withValues(alpha: 0.36),
          legalMoveDot: const Color(0xFF1E1E1E).withValues(alpha: clampedOpacity),
        ),
    };
  }
}

/// Centralized tactile feedback helper for chess events (captures, checks, premoves, promotions).
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
    } else if (isPremove) {
      await HapticFeedback.selectionClick();
    } else {
      await HapticFeedback.selectionClick();
    }
  }
}

/// Smoothed vertical Stockfish Evaluation Bar using Curves.easeInOut and numeric advantage badge.
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
    if (forcedMateIn != null) {
      return forcedMateIn! > 0 ? 0.97 : 0.03;
    }
    final clamped = evalCentipawns.clamp(-1000, 1000).toDouble();
    final sigmoid = 1.0 / (1.0 + math.exp(-0.004 * clamped));
    return sigmoid.clamp(0.04, 0.96);
  }

  String _formatEvalLabel() {
    if (forcedMateIn != null) {
      return 'M${forcedMateIn!.abs()}';
    }
    final pawns = evalCentipawns / 100.0;
    final sign = pawns > 0 ? '+' : '';
    return '$sign${pawns.toStringAsFixed(1)}';
  }

  @override
  Widget build(BuildContext context) {
    final whiteFraction = _computeWhiteFraction();
    final displayWhiteFraction = isFlipped ? (1.0 - whiteFraction) : whiteFraction;

    return Container(
      width: 28,
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF2C2C2C)),
      ),
      clipBehavior: Clip.antiAlias,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final whiteHeight = constraints.maxHeight * displayWhiteFraction;
          return Stack(
            children: [
              Align(
                alignment: Alignment.bottomCenter,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 420),
                  curve: Curves.easeInOut,
                  width: double.infinity,
                  height: whiteHeight,
                  color: const Color(0xFFE5E7EB),
                ),
              ),
              Positioned(
                top: 6,
                left: 2,
                right: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.72),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    _formatEvalLabel(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Adaptive Chess Clock with large tabular typography, <30s warning and <10s critical pulse.
class AdaptiveChessClock extends StatefulWidget {
  const AdaptiveChessClock({
    super.key,
    required this.remainingDuration,
    required this.isActiveTurn,
  });

  final Duration remainingDuration;
  final bool isActiveTurn;

  @override
  State<AdaptiveChessClock> createState() => _AdaptiveChessClockState();
}

class _AdaptiveChessClockState extends State<AdaptiveChessClock>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ms = widget.remainingDuration.inMilliseconds;
    final isCritical = ms < 10000;
    final isWarning = ms >= 10000 && ms < 30000;

    final bgColor = isCritical
        ? const Color(0xFF7F1D1D)
        : isWarning
            ? const Color(0xFF78350F)
            : const Color(0xFF1E1E1E);

    final textColor = isCritical
        ? const Color(0xFFFCA5A5)
        : isWarning
            ? const Color(0xFFFDE68A)
            : const Color(0xFFF3F4F6);

    final minutes = (ms ~/ 60000).toString().padLeft(2, '0');
    final seconds = ((ms % 60000) ~/ 1000).toString().padLeft(2, '0');
    final tenths = ((ms % 1000) ~/ 100).toString();
    final formatted = ms < 20000 ? '$minutes:$seconds.$tenths' : '$minutes:$seconds';

    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final scale = (widget.isActiveTurn && isCritical)
            ? 1.0 + (_pulseController.value * 0.035)
            : 1.0;
        return Transform.scale(
          scale: scale,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isCritical
                    ? const Color(0xFFEF4444)
                    : isWarning
                        ? const Color(0xFFD97706)
                        : const Color(0xFF2C2C2C),
                width: 1.5,
              ),
            ),
            child: Text(
              formatted,
              style: TextStyle(
                color: textColor,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Gesture wrapper for the analysis board: horizontal swipe scrubs moves, vertical swipe down opens quick actions.
class AnalysisBoardGestureDetector extends StatelessWidget {
  const AnalysisBoardGestureDetector({
    super.key,
    required this.boardChild,
    required this.onStepForward,
    required this.onStepBackward,
    required this.onOpenQuickActionsSheet,
  });

  final Widget boardChild;
  final VoidCallback onStepForward;
  final VoidCallback onStepBackward;
  final VoidCallback onOpenQuickActionsSheet;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragEnd: (details) {
        final vx = details.primaryVelocity ?? 0;
        if (vx < -180) {
          HapticFeedback.selectionClick();
          onStepForward();
        } else if (vx > 180) {
          HapticFeedback.selectionClick();
          onStepBackward();
        }
      },
      onVerticalDragEnd: (details) {
        final vy = details.primaryVelocity ?? 0;
        if (vy > 240) {
          HapticFeedback.mediumImpact();
          onOpenQuickActionsSheet();
        }
      },
      child: boardChild,
    );
  }
}

/// One-Click Critical Moment Cards in Post-Game Analysis ("Критическая ошибка", "Переломный момент", "Лучший тактический удар").
class OneClickCriticalMomentsStrip extends StatelessWidget {
  const OneClickCriticalMomentsStrip({
    super.key,
    required this.moments,
    required this.activePly,
    required this.onJumpToMoment,
  });

  final List<CriticalGameMoment> moments;
  final int activePly;
  final ValueChanged<CriticalGameMoment> onJumpToMoment;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final moment in moments)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                HapticFeedback.selectionClick();
                onJumpToMoment(moment);
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: moment.ply == activePly
                        ? const Color(0xFFD97706)
                        : const Color(0xFF2C2C2C),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${moment.moveSan} · ${moment.description}',
                            style: const TextStyle(
                              color: Color(0xFFF3F4F6),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Лучший ход по движку: ${moment.bestEngineMoveSan}',
                            style: const TextStyle(
                              color: Color(0xFF9CA3AF),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right,
                      color: Color(0xFFD97706),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
