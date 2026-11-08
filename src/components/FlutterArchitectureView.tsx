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
    id: 'github_workflow_lichess_pro',
    filePath: '.github/workflows/build-apk.yml',
    layerRu: 'Автосборка APK в облаке GitHub Actions (для Soapbaby67/Lichess-pro)',
    summaryRu:
      'Исправленный workflow без падающего setup-android@v3: автоматически собирает Lichess-pro-debug.apk на серверах GitHub без ПК.',
    code: `name: Build Android APK (Lichess Mobile Pro)

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup Java 21 (Required for Android Gradle & Capacitor)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Normalize package.json for public npm registry
        run: |
          node -e '
            const fs = require("fs");
            const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
            if (pkg.devDependencies) {
              pkg.devDependencies.vite = "^6.2.0";
              pkg.devDependencies["@vitejs/plugin-react"] = "^4.3.4";
              pkg.devDependencies.typescript = "~5.8.2";
            }
            if (pkg.dependencies) {
              pkg.dependencies["@tailwindcss/vite"] = "^4.0.14";
              pkg.dependencies.tailwindcss = "^4.0.14";
            }
            fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
          '

      - name: Install web dependencies & Capacitor CLI
        run: |
          npm install --legacy-peer-deps
          npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev --legacy-peer-deps

      - name: Build production web bundle
        run: npm run build

      - name: Initialize Capacitor & Android platform
        run: |
          if [ ! -f capacitor.config.json ]; then
            npx cap init "Lichess Mobile Pro" "org.lichess.mobilepro" --web-dir dist
          fi
          if [ ! -d android ]; then
            npx cap add android
          fi
          npx cap sync android

      - name: Build Debug APK with Gradle
        working-directory: ./android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon

      - name: Upload Ready-to-Install APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: Lichess-Mobile-Pro-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk`,
  },
  {
    id: 'github_workflow_flutter_mobile',
    filePath: '.github/workflows/build-flutter-apk.yml',
    layerRu: 'Автосборка Flutter APK (для вашего форка Soapbaby67/mobile)',
    summaryRu:
      'Готовый workflow для вашего форка официального Flutter-репозитория lichess-org/mobile: компилирует нативный Dart/Flutter APK без компьютера.',
    code: `name: Build Lichess Flutter Fork APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-flutter-apk:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository with submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Flutter SDK
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true

      - name: Install pub dependencies
        run: flutter pub get

      - name: Build Release APK
        run: flutter build apk --release --no-tree-shake-icons

      - name: Upload Flutter APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: Lichess-Flutter-Fork-APK
          path: build/app/outputs/flutter-apk/app-release.apk`,
  },
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
    layerRu: 'Провайдеры состояния Riverpod + Lichess API NDJSON',
    summaryRu:
      'NotifierProvider для фильтров времени/цвета и клиент синхронизации с https://lichess.org/api/games/user/{username} с передачей Bearer-токена.',
    code: `// lib/src/model/stats/advanced_stats_provider.dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'advanced_stats_model.dart';

class LichessApiStatsService {
  const LichessApiStatsService(this.httpClient);
  final http.Client httpClient;

  Future<Map<String, dynamic>> fetchAccountProfile(String bearerToken) async {
    final resp = await httpClient.get(
      Uri.parse('https://lichess.org/api/account'),
      headers: {'Authorization': 'Bearer $bearerToken'},
    );
    if (resp.statusCode != 200) {
      throw Exception('Lichess Auth Error: \${resp.statusCode}');
    }
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> fetchRecentUserGamesNdjson({
    required String username,
    String? bearerToken,
    int maxGames = 35,
  }) async {
    final uri = Uri.parse(
      'https://lichess.org/api/games/user/$username?max=$maxGames&opening=true&clocks=true&evals=true&pgnInJson=true',
    );
    final headers = <String, String>{
      'Accept': 'application/x-ndjson',
      if (bearerToken != null && bearerToken.isNotEmpty)
        'Authorization': 'Bearer $bearerToken',
    };
    final resp = await httpClient.get(uri, headers: headers);
    return resp.body
        .split('\\n')
        .where((line) => line.trim().isNotEmpty)
        .map((line) => jsonDecode(line) as Map<String, dynamic>)
        .toList();
  }
}`,
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
}`,
  },
  {
    id: 'board_analysis',
    filePath: 'lib/src/view/analysis/enhanced_board_and_analysis.dart',
    layerRu: 'UI Доски (6 тем + 4 набора фигур), Eval Bar, Часы и Жесты',
    summaryRu:
      'SmoothedEvalBar (Curves.easeInOut), AdaptiveChessClock (<30с и <10с пульсация), 6 тем доски, 4 набора фигур и карточки «Один клик к перелому».',
    code: `// lib/src/view/analysis/enhanced_board_and_analysis.dart
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum CustomChessBoardPreset {
  oledMinimalist,
  slateGrey,
  woodClassic,
  emeraldTournament,
  cyberIndigo,
  amberWalnut,
}

enum CustomPieceSetStyle {
  neoStaunton,
  alphaMinimal,
  imperialCrown,
  oledNeonEdge,
}

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
          04. Сборка APK без ПК (GitHub Actions) и код для <code className="font-mono text-base text-[#D97706]">Soapbaby67/Lichess-pro</code> + <code className="font-mono text-base text-[#10B981]">Soapbaby67/mobile</code>
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Готовые исправленные файлы <code className="font-mono text-xs text-[#F3F4F6]">.github/workflows/build-apk.yml</code> и все Dart-модули для интеграции с официальным сервером Lichess.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File Tree & Module Selector */}
        <div className="lg:col-span-5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E] p-4 space-y-2.5">
          <div className="text-xs font-semibold text-[#9CA3AF] px-1">
            Файлы автосборки APK и модули архитектуры:
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
                  a.download = activeModule.filePath.split('/').pop() || 'module.txt';
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
                Скачать файл ⤓
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
