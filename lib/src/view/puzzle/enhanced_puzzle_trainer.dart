// lib/src/view/puzzle/enhanced_puzzle_trainer.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../model/stats/advanced_stats_model.dart';

class EnhancedPuzzleTrainerScreen extends StatefulWidget {
  const EnhancedPuzzleTrainerScreen({
    super.key,
    required this.puzzles,
  });

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

  GeneratedPersonalPuzzle get _currentPuzzle => widget.puzzles[_currentIndex];

  @override
  void dispose() {
    _autoNextTimer?.cancel();
    super.dispose();
  }

  void _handleMoveAttempt(String uciMove) {
    _autoNextTimer?.cancel();
    final expected = _currentPuzzle.solutionUciMoves.first;

    if (uciMove == expected) {
      HapticFeedback.lightImpact();
      setState(() {
        _status = PuzzleAttemptStatus.solved;
      });
      if (_autoAdvanceEnabled) {
        _autoNextTimer = Timer(const Duration(milliseconds: 1500), () {
          if (mounted) _goToNextPuzzle();
        });
      }
    } else {
      HapticFeedback.heavyImpact();
      setState(() {
        _status = PuzzleAttemptStatus.failed;
      });
    }
  }

  void _instantRestartCurrentPuzzle() {
    _autoNextTimer?.cancel();
    HapticFeedback.selectionClick();
    setState(() {
      _status = PuzzleAttemptStatus.idle;
    });
  }

  void _goToNextPuzzle() {
    _autoNextTimer?.cancel();
    HapticFeedback.selectionClick();
    setState(() {
      _currentIndex = (_currentIndex + 1) % widget.puzzles.length;
      _status = PuzzleAttemptStatus.idle;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: const Color(0xFF121212),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Автопереход через 1.5 сек после решения',
              style: TextStyle(color: Color(0xFFF3F4F6), fontSize: 14),
            ),
            value: _autoAdvanceEnabled,
            activeColor: const Color(0xFF10B981),
            onChanged: (val) {
              HapticFeedback.selectionClick();
              setState(() => _autoAdvanceEnabled = val);
            },
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (_status == PuzzleAttemptStatus.failed)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEF4444),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: _instantRestartCurrentPuzzle,
                  icon: const Icon(Icons.replay),
                  label: const Text('Моментальный рестарт'),
                ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: () =>
                    _handleMoveAttempt(_currentPuzzle.solutionUciMoves.first),
                child: const Text('Проверить решение'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
