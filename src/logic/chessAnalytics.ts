export type TimeframeFilter = 'day' | 'week' | 'month' | 'all';
export type PerfControl = 'bullet' | 'blitz' | 'rapid' | 'classical';
export type RepertoireColorFilter = 'all' | 'white' | 'black';

export type BoardThemeId =
  | 'oled_minimalist'
  | 'slate_grey'
  | 'wood_classic'
  | 'emerald_tournament'
  | 'cyber_indigo'
  | 'amber_walnut';

export type PieceSetId =
  | 'neo_staunton'
  | 'alpha_minimal'
  | 'imperial_crown'
  | 'oled_neon_edge';

export type FormStatus = 'peak' | 'stable' | 'slump';
export type TacticalMotif =
  | 'missed_pin'
  | 'knight_fork'
  | 'overload'
  | 'back_rank'
  | 'hanging_piece';

export interface OpeningStatDto {
  id: string;
  eco: string;
  nameRu: string;
  variationRu: string;
  side: 'white' | 'black';
  wins: number;
  draws: number;
  losses: number;
  avgEvalDropCp: number;
  avgMoveTimeSec: number;
  criticalPly: number;
  criticalMoveSan: string;
  blindSpotReasonRu: string;
  sampleFen: string;
  evalCpAfterMistake: number;
  bestReplySan: string;
}

export interface TimeMoveBucketDto {
  moveNumber: number;
  avgSecondsSpent: number;
  remainingClockSec: number;
  accuracyPct: number;
  stage: 'opening' | 'middlegame' | 'endgame';
  sampleSan: string;
}

export interface StageAccuracyDto {
  stage: 'opening' | 'middlegame' | 'endgame';
  labelRu: string;
  avgSecPerMove: number;
  accuracyPct: number;
  blundersPer100Moves: number;
  optimalPaceRangeSec: string;
}

export interface TacticalMistakePatternDto {
  motif: TacticalMotif;
  titleRu: string;
  descriptionRu: string;
  occurrencesLast30Days: number;
  avgCentipawnLoss: number;
  severity: 'critical' | 'high' | 'moderate';
}

export interface PersonalPuzzleDto {
  id: string;
  motif: TacticalMotif;
  motifLabelRu: string;
  gameOpponent: string;
  gameRating: number;
  datePlayed: string;
  eco: string;
  initialFen: string;
  playerColor: 'white' | 'black';
  blunderMovePlayedSan: string;
  solutionUci: string;
  solutionSan: string;
  fromSquare: string;
  toSquare: string;
  explanationRu: string;
  evalBefore: string;
  evalAfter: string;
}

export interface RatingPointDto {
  label: string;
  timestamp: string;
  rating: number;
  accuracy: number;
  opponent: string;
  result: 'W' | 'D' | 'L';
}

export interface StreakFormDto {
  currentWinStreak: number;
  bestWinStreakSeason: number;
  last10AccuracyPct: number;
  last10Record: { w: number; d: number; l: number };
  formStatus: FormStatus;
  ratingDeltaLast10: number;
}

export interface TerminationBreakdownDto {
  mateWins: number;
  resignWins: number;
  timeoutWins: number;
  mateLosses: number;
  resignLosses: number;
  timeoutLosses: number;
  draws: number;
}

export interface ColorPerformanceDto {
  whiteWins: number;
  whiteDraws: number;
  whiteLosses: number;
  whiteAvgAccuracy: number;
  blackWins: number;
  blackDraws: number;
  blackLosses: number;
  blackAvgAccuracy: number;
  avgOpponentRating: number;
  peakRating: number;
}

export interface RealPlayedGameSummaryDto {
  id: string;
  createdAtStr: string;
  perf: string;
  speedLabel: string;
  playerColor: 'white' | 'black';
  opponentName: string;
  opponentRating: number;
  result: 'W' | 'D' | 'L';
  statusRu: string;
  eco: string;
  openingName: string;
  movesUci: string[];
  movesSan: string[];
  clocksCentis: number[];
  accuracyPct?: number;
}

export type CriticalMomentKind = 'critical_blunder' | 'turning_point' | 'best_tactical_strike';

export interface CriticalMomentDto {
  id: string;
  kind: CriticalMomentKind;
  badgeRu: string;
  plyIndex: number;
  moveNumber: number;
  san: string;
  prevSan: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  bestEngineMoveSan: string;
  summaryRu: string;
}

export interface AnalyzedPlyDto {
  plyIndex: number;
  moveNumber: number;
  side: 'white' | 'black';
  san: string;
  from: string;
  to: string;
  fen: string;
  evalCp: number;
  mate?: number;
  whiteClockMs: number;
  blackClockMs: number;
  moveTimeSec: number;
  classification?: 'brilliant' | 'great' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';
  commentRu?: string;
}

export interface WinDrawLossPercentages {
  winPct: number;
  drawPct: number;
  lossPct: number;
  totalGames: number;
}

export const INITIAL_CHESS_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Pure calculation of W/D/L percentages rounded to 1 decimal place with exact 100% sum.
 */
export function computeWinDrawLossPercentages(
  wins: number,
  draws: number,
  losses: number
): WinDrawLossPercentages {
  const safeW = Math.max(0, wins);
  const safeD = Math.max(0, draws);
  const safeL = Math.max(0, losses);
  const totalGames = safeW + safeD + safeL;

  if (totalGames === 0) {
    return { winPct: 0, drawPct: 0, lossPct: 0, totalGames: 0 };
  }

  const winPct = Math.round((safeW / totalGames) * 1000) / 10;
  const drawPct = Math.round((safeD / totalGames) * 1000) / 10;
  const lossPct = Math.max(0, Math.round((100 - winPct - drawPct) * 10) / 10);

  return { winPct, drawPct, lossPct, totalGames };
}

/**
 * Detects "blind spots" in the user's opening repertoire where either average centipawn loss
 * exceeds cplThreshold OR average time spent on the critical move exceeds timeThresholdSec.
 */
export function detectOpeningBlindSpots(
  openings: OpeningStatDto[],
  cplThreshold = 95,
  timeThresholdSec = 14
): OpeningStatDto[] {
  return openings
    .filter(
      (item) => item.avgEvalDropCp >= cplThreshold || item.avgMoveTimeSec >= timeThresholdSec
    )
    .sort((a, b) => {
      const scoreA = a.avgEvalDropCp + a.avgMoveTimeSec * 4;
      const scoreB = b.avgEvalDropCp + b.avgMoveTimeSec * 4;
      return scoreB - scoreA;
    });
}

export type MoveTimeAnomaly = 'deep_think' | 'impulse_zeitnot' | 'normal';

export function classifyMoveTimeAnomaly(
  secondsSpent: number,
  remainingClockSec: number
): MoveTimeAnomaly {
  if (secondsSpent >= 18) {
    return 'deep_think';
  }
  if (remainingClockSec <= 25 && secondsSpent <= 2.2) {
    return 'impulse_zeitnot';
  }
  return 'normal';
}

export function computeEvalBarPercentage(evalInput: { cp?: number; mate?: number }): number {
  if (typeof evalInput.mate === 'number') {
    return evalInput.mate > 0 ? 97 : 3;
  }
  const cp = evalInput.cp ?? 0;
  const clampedCp = Math.max(-1000, Math.min(1000, cp));
  const winChance = 1 / (1 + Math.exp(-0.004 * clampedCp));
  return Math.round(Math.max(4, Math.min(96, winChance * 100)) * 10) / 10;
}

export function formatEvalBadge(evalInput: { cp?: number; mate?: number }): string {
  if (typeof evalInput.mate === 'number') {
    return `M${Math.abs(evalInput.mate)}`;
  }
  const pawns = (evalInput.cp ?? 0) / 100;
  const sign = pawns > 0 ? '+' : '';
  return `${sign}${pawns.toFixed(1)}`;
}

export type ClockUrgency = 'normal' | 'warning' | 'critical';

export function classifyClockUrgency(remainingMs: number): ClockUrgency {
  if (remainingMs < 10_000) {
    return 'critical';
  }
  if (remainingMs < 30_000) {
    return 'warning';
  }
  return 'normal';
}

export function formatClockTime(remainingMs: number): string {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);

  if (safeMs < 20_000) {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface BoardSquarePiece {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
}

export function parseFenToBoard(fen: string): (BoardSquarePiece | null)[][] {
  const placement = fen.trim().split(/\s+/)[0] || '8/8/8/8/8/8/8/8';
  const rows = placement.split('/');
  const board: (BoardSquarePiece | null)[][] = [];

  for (let r = 0; r < 8; r++) {
    const rowStr = rows[r] || '8';
    const row: (BoardSquarePiece | null)[] = [];
    for (const ch of rowStr) {
      if (ch >= '1' && ch <= '8') {
        const emptyCount = parseInt(ch, 10);
        for (let k = 0; k < emptyCount; k++) {
          row.push(null);
        }
      } else {
        const lower = ch.toLowerCase() as BoardSquarePiece['type'];
        const color: 'w' | 'b' = ch === ch.toUpperCase() ? 'w' : 'b';
        row.push({ type: lower, color });
      }
    }
    while (row.length < 8) row.push(null);
    board.push(row.slice(0, 8));
  }
  return board;
}

export function squareToCoords(square: string): { row: number; col: number } | null {
  if (!square || square.length < 2) return null;
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const row = 8 - rank;
  if (col < 0 || col > 7 || row < 0 || row > 7 || Number.isNaN(row)) return null;
  return { row, col };
}

export function coordsToSquare(row: number, col: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = String(8 - row);
  return `${file}${rank}`;
}

/**
 * Applies a UCI move (including castling & promotion) to a FEN string.
 */
export function applyUciMoveToFen(fen: string, uci: string): {
  nextFen: string;
  captured: boolean;
  promoted: boolean;
} {
  const parts = fen.trim().split(/\s+/);
  const board = parseFenToBoard(fen);
  const fromSq = uci.slice(0, 2);
  const toSq = uci.slice(2, 4);
  const promoChar = uci[4]?.toLowerCase() as BoardSquarePiece['type'] | undefined;

  const from = squareToCoords(fromSq);
  const to = squareToCoords(toSq);
  if (!from || !to) {
    return { nextFen: fen, captured: false, promoted: false };
  }

  const movingPiece = board[from.row][from.col];
  if (!movingPiece) {
    return { nextFen: fen, captured: false, promoted: false };
  }

  const targetPiece = board[to.row][to.col];
  const captured = targetPiece !== null;
  const isPawnPromotion =
    movingPiece.type === 'p' && (to.row === 0 || to.row === 7);

  // Handle king castling rook movement
  if (movingPiece.type === 'k' && Math.abs(to.col - from.col) === 2) {
    if (to.col === 6) {
      // Kingside castle
      board[from.row][5] = board[from.row][7];
      board[from.row][7] = null;
    } else if (to.col === 2) {
      // Queenside castle
      board[from.row][3] = board[from.row][0];
      board[from.row][0] = null;
    }
  }

  board[from.row][from.col] = null;
  board[to.row][to.col] = {
    type: isPawnPromotion ? promoChar || 'q' : movingPiece.type,
    color: movingPiece.color,
  };

  const newRows = board.map((row) => {
    let str = '';
    let empty = 0;
    for (const cell of row) {
      if (!cell) {
        empty++;
      } else {
        if (empty > 0) {
          str += String(empty);
          empty = 0;
        }
        str += cell.color === 'w' ? cell.type.toUpperCase() : cell.type;
      }
    }
    if (empty > 0) str += String(empty);
    return str;
  });

  const nextTurn = (parts[1] || 'w') === 'w' ? 'b' : 'w';
  const castling = parts[2] || '-';
  const ep = '-';
  const halfmove = captured ? '0' : String((parseInt(parts[4] || '0', 10) || 0) + 1);
  const fullmove =
    nextTurn === 'w'
      ? String((parseInt(parts[5] || '1', 10) || 1) + 1)
      : parts[5] || '1';

  return {
    nextFen: `${newRows.join('/')} ${nextTurn} ${castling} ${ep} ${halfmove} ${fullmove}`,
    captured,
    promoted: isPawnPromotion,
  };
}

/**
 * Generates pseudo-legal destination squares for interactive board exploration & online play.
 */
export function getPseudoLegalTargets(fen: string, fromSquare: string): string[] {
  const coords = squareToCoords(fromSquare);
  if (!coords) return [];
  const board = parseFenToBoard(fen);
  const piece = board[coords.row][coords.col];
  if (!piece) return [];

  const targets: string[] = [];
  const addIfValid = (r: number, c: number): boolean => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const occ = board[r][c];
    if (!occ) {
      targets.push(coordsToSquare(r, c));
      return true;
    }
    if (occ.color !== piece.color) {
      targets.push(coordsToSquare(r, c));
    }
    return false;
  };

  const { row, col } = coords;
  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    if (row + dir >= 0 && row + dir <= 7 && !board[row + dir][col]) {
      targets.push(coordsToSquare(row + dir, col));
      if (row === startRow && !board[row + dir * 2]?.[col]) {
        targets.push(coordsToSquare(row + dir * 2, col));
      }
    }
    for (const dc of [-1, 1]) {
      const nr = row + dir;
      const nc = col + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const occ = board[nr][nc];
        if (occ && occ.color !== piece.color) {
          targets.push(coordsToSquare(nr, nc));
        }
      }
    }
  } else if (piece.type === 'n') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of jumps) addIfValid(row + dr, col + dc);
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) addIfValid(row + dr, col + dc);
      }
    }
    // Castling targets for convenience
    if (piece.color === 'w' && row === 7 && col === 4) {
      if (!board[7][5] && !board[7][6]) targets.push('g1');
      if (!board[7][3] && !board[7][2] && !board[7][1]) targets.push('c1');
    }
    if (piece.color === 'b' && row === 0 && col === 4) {
      if (!board[0][5] && !board[0][6]) targets.push('g8');
      if (!board[0][3] && !board[0][2] && !board[0][1]) targets.push('c8');
    }
  } else {
    const dirs: [number, number][] = [];
    if (piece.type === 'b' || piece.type === 'q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    if (piece.type === 'r' || piece.type === 'q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (addIfValid(r, c)) {
        r += dr;
        c += dc;
      }
    }
  }

  return targets;
}

/**
 * Replays a sequence of space-separated UCI moves from initial FEN into AnalyzedPlyDto[]
 * so any real Lichess game or live match can be scrubbed move-by-move on the board.
 */
export function replayUciMovesToAnalyzedPlies(
  uciMoves: string[],
  sanMoves?: string[],
  clocksCentis?: number[]
): AnalyzedPlyDto[] {
  let currentFen = INITIAL_CHESS_FEN;
  const plies: AnalyzedPlyDto[] = [];
  let prevWhiteMs = 180_000;
  let prevBlackMs = 180_000;

  for (let i = 0; i < uciMoves.length; i++) {
    const uci = uciMoves[i];
    if (!uci || uci.length < 4) continue;
    const side: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const moveNumber = Math.floor(i / 2) + 1;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const res = applyUciMoveToFen(currentFen, uci);
    currentFen = res.nextFen;

    const clockCenti = clocksCentis?.[i];
    const currentClockMs =
      typeof clockCenti === 'number' ? clockCenti * 10 : Math.max(5_000, 180_000 - i * 3200);

    const moveTimeSec =
      side === 'white'
        ? Math.max(0.5, Math.round(((prevWhiteMs - currentClockMs) / 1000) * 10) / 10)
        : Math.max(0.5, Math.round(((prevBlackMs - currentClockMs) / 1000) * 10) / 10);

    if (side === 'white') prevWhiteMs = currentClockMs;
    else prevBlackMs = currentClockMs;

    const rawSan = sanMoves?.[i] || `${from}→${to}`;
    const formattedSan =
      side === 'white' ? `${moveNumber}. ${rawSan}` : `${moveNumber}... ${rawSan}`;

    // Estimate evaluation from material balance on board
    const board = parseFenToBoard(currentFen);
    const values: Record<BoardSquarePiece['type'], number> = {
      p: 100,
      n: 310,
      b: 330,
      r: 500,
      q: 900,
      k: 0,
    };
    let materialCp = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell) {
          materialCp += cell.color === 'w' ? values[cell.type] : -values[cell.type];
        }
      }
    }

    plies.push({
      plyIndex: i,
      moveNumber,
      side,
      san: formattedSan,
      from,
      to,
      fen: currentFen,
      evalCp: materialCp,
      whiteClockMs: prevWhiteMs,
      blackClockMs: prevBlackMs,
      moveTimeSec: Math.min(45, moveTimeSec),
    });
  }

  return plies;
}

// ============================================================================
// DEFAULT / FALLBACK SEED DATA (USED BEFORE LOGIN OR IN OFFLINE MODE)
// ============================================================================

export const DEFAULT_TERMINATION_BREAKDOWN: TerminationBreakdownDto = {
  mateWins: 28,
  resignWins: 44,
  timeoutWins: 19,
  mateLosses: 14,
  resignLosses: 26,
  timeoutLosses: 15,
  draws: 16,
};

export const DEFAULT_COLOR_PERFORMANCE: ColorPerformanceDto = {
  whiteWins: 51,
  whiteDraws: 9,
  whiteLosses: 22,
  whiteAvgAccuracy: 90.6,
  blackWins: 40,
  blackDraws: 7,
  blackLosses: 33,
  blackAvgAccuracy: 86.4,
  avgOpponentRating: 2118,
  peakRating: 2169,
};

export const DEFAULT_RECENT_GAMES: RealPlayedGameSummaryDto[] = [
  {
    id: 'lic-9981a',
    createdAtStr: 'Сегодня, 22:30',
    perf: 'blitz',
    speedLabel: 'BLITZ 3+0',
    playerColor: 'white',
    opponentName: 'DarkSquare99',
    opponentRating: 2160,
    result: 'W',
    statusRu: 'Мат',
    eco: 'B90',
    openingName: 'Сицилианская защита: Вариант Найдорфа',
    movesUci: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6', 'c1e3', 'e7e5'],
    movesSan: ['e4', 'c5', 'Кf3', 'd6', 'd4', 'cxd4', 'Кxd4', 'Кf6', 'Кc3', 'a6', 'Сe3', 'e5'],
    clocksCentis: [18000, 18000, 17850, 17900, 17620, 17710, 17400, 17200, 16900, 16500, 16100, 15400],
    accuracyPct: 95.3,
  },
  {
    id: 'lic-9980b',
    createdAtStr: 'Сегодня, 21:00',
    perf: 'blitz',
    speedLabel: 'BLITZ 3+0',
    playerColor: 'black',
    opponentName: 'BlitzPhantom',
    opponentRating: 2142,
    result: 'W',
    statusRu: 'Сдача',
    eco: 'B12',
    openingName: 'Защита Каро-Канн: Закрытый вариант',
    movesUci: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'e4e5', 'c8f5', 'g1f3', 'e7e6', 'f1e2', 'c6c5'],
    movesSan: ['e4', 'c6', 'd4', 'd5', 'e5', 'Сf5', 'Кf3', 'e6', 'Сe2', 'c5'],
    clocksCentis: [18000, 18000, 17700, 17800, 17500, 17400, 17100, 16900, 16400, 16100],
    accuracyPct: 92.6,
  },
  {
    id: 'lic-9979c',
    createdAtStr: 'Сегодня, 19:10',
    perf: 'rapid',
    speedLabel: 'RAPID 10+0',
    playerColor: 'white',
    opponentName: 'SicilianMaster',
    opponentRating: 2148,
    result: 'W',
    statusRu: 'Флаг (время)',
    eco: 'C65',
    openingName: 'Испанская партия: Берлинская защита',
    movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'g8f6', 'd2d3', 'f8c5', 'c2c3', 'e8g8'],
    movesSan: ['e4', 'e5', 'Кf3', 'Кc6', 'Сb5', 'Кf6', 'd3', 'Сc5', 'c3', 'O-O'],
    clocksCentis: [60000, 60000, 59400, 59100, 58800, 58200, 57500, 56900, 56100, 55200],
    accuracyPct: 94.1,
  },
  {
    id: 'lic-9978d',
    createdAtStr: 'Сегодня, 13:05',
    perf: 'blitz',
    speedLabel: 'BLITZ 3+2',
    playerColor: 'black',
    opponentName: 'TacticWolf',
    opponentRating: 2110,
    result: 'L',
    statusRu: 'Сдача',
    eco: 'E60',
    openingName: 'Староиндийская защита: Классическая система',
    movesUci: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6', 'g1f3', 'e8g8'],
    movesSan: ['d4', 'Кf6', 'c4', 'g6', 'Кc3', 'Сg7', 'e4', 'd6', 'Кf3', 'O-O'],
    clocksCentis: [18000, 18000, 17900, 17800, 17600, 17500, 17200, 16800, 16400, 15100],
    accuracyPct: 78.5,
  },
];

export const STREAK_BY_PERF: Record<PerfControl, StreakFormDto> = {
  blitz: {
    currentWinStreak: 7,
    bestWinStreakSeason: 12,
    last10AccuracyPct: 91.4,
    last10Record: { w: 8, d: 1, l: 1 },
    formStatus: 'peak',
    ratingDeltaLast10: +46,
  },
  rapid: {
    currentWinStreak: 3,
    bestWinStreakSeason: 9,
    last10AccuracyPct: 88.7,
    last10Record: { w: 6, d: 2, l: 2 },
    formStatus: 'stable',
    ratingDeltaLast10: +18,
  },
  bullet: {
    currentWinStreak: 0,
    bestWinStreakSeason: 15,
    last10AccuracyPct: 81.2,
    last10Record: { w: 4, d: 0, l: 6 },
    formStatus: 'slump',
    ratingDeltaLast10: -24,
  },
  classical: {
    currentWinStreak: 4,
    bestWinStreakSeason: 6,
    last10AccuracyPct: 93.8,
    last10Record: { w: 7, d: 2, l: 1 },
    formStatus: 'peak',
    ratingDeltaLast10: +34,
  },
};

export const RATING_SERIES_BY_TIMEFRAME: Record<TimeframeFilter, RatingPointDto[]> = {
  day: [
    { label: '10:15', timestamp: 'Сегодня, 10:15', rating: 2112, accuracy: 87.4, opponent: 'GM_Vortex', result: 'W' },
    { label: '11:40', timestamp: 'Сегодня, 11:40', rating: 2119, accuracy: 91.0, opponent: 'KarpovStyle', result: 'W' },
    { label: '13:05', timestamp: 'Сегодня, 13:05', rating: 2113, accuracy: 78.5, opponent: 'TacticWolf', result: 'L' },
    { label: '15:20', timestamp: 'Сегодня, 15:20', rating: 2121, accuracy: 93.2, opponent: 'NordicKnight', result: 'W' },
    { label: '17:45', timestamp: 'Сегодня, 17:45', rating: 2129, accuracy: 90.8, opponent: 'EndgamePro', result: 'W' },
    { label: '19:10', timestamp: 'Сегодня, 19:10', rating: 2138, accuracy: 94.1, opponent: 'SicilianMaster', result: 'W' },
    { label: '21:00', timestamp: 'Сегодня, 21:00', rating: 2146, accuracy: 92.6, opponent: 'BlitzPhantom', result: 'W' },
    { label: '22:30', timestamp: 'Сегодня, 22:30', rating: 2154, accuracy: 95.3, opponent: 'DarkSquare99', result: 'W' },
  ],
  week: [
    { label: 'Пн', timestamp: 'Понедельник', rating: 2088, accuracy: 85.2, opponent: 'ChessZen', result: 'W' },
    { label: 'Вт', timestamp: 'Вторник', rating: 2096, accuracy: 88.9, opponent: 'Alapin Hero', result: 'W' },
    { label: 'Ср', timestamp: 'Среда', rating: 2084, accuracy: 76.4, opponent: 'NajdorfKing', result: 'L' },
    { label: 'Чт', timestamp: 'Четверг', rating: 2105, accuracy: 90.1, opponent: 'BerlinWall', result: 'W' },
    { label: 'Пт', timestamp: 'Пятница', rating: 2118, accuracy: 89.5, opponent: 'LondonFog', result: 'D' },
    { label: 'Сб', timestamp: 'Суббота', rating: 2136, accuracy: 92.8, opponent: 'TalSpirit', result: 'W' },
    { label: 'Вс', timestamp: 'Воскресенье', rating: 2154, accuracy: 94.2, opponent: 'DarkSquare99', result: 'W' },
  ],
  month: [
    { label: 'Нед 1', timestamp: '1–7 окт', rating: 2035, accuracy: 84.0, opponent: 'Ср. за 24 партии', result: 'W' },
    { label: 'Нед 2', timestamp: '8–14 окт', rating: 2062, accuracy: 86.7, opponent: 'Ср. за 31 партию', result: 'W' },
    { label: 'Нед 3', timestamp: '15–21 окт', rating: 2051, accuracy: 82.9, opponent: 'Ср. за 19 партий', result: 'L' },
    { label: 'Нед 4', timestamp: '22–28 окт', rating: 2094, accuracy: 89.3, opponent: 'Ср. за 28 партий', result: 'W' },
    { label: 'Нед 5', timestamp: '29 окт – 7 ноя', rating: 2154, accuracy: 91.4, opponent: 'Ср. за 35 партий', result: 'W' },
  ],
  all: [
    { label: 'Янв', timestamp: 'Январь 2026', rating: 1840, accuracy: 79.5, opponent: 'Сезон 1', result: 'W' },
    { label: 'Мар', timestamp: 'Март 2026', rating: 1910, accuracy: 82.1, opponent: 'Сезон 2', result: 'W' },
    { label: 'Май', timestamp: 'Май 2026', rating: 1965, accuracy: 84.6, opponent: 'Сезон 3', result: 'D' },
    { label: 'Июл', timestamp: 'Июль 2026', rating: 2012, accuracy: 86.8, opponent: 'Сезон 4', result: 'W' },
    { label: 'Сен', timestamp: 'Сентябрь 2026', rating: 2078, accuracy: 88.9, opponent: 'Сезон 5', result: 'W' },
    { label: 'Ноя', timestamp: 'Ноябрь 2026', rating: 2154, accuracy: 91.4, opponent: 'Пик сезона', result: 'W' },
  ],
};

export const OPENING_REPERTOIRE_DATA: OpeningStatDto[] = [
  {
    id: 'eco-b90',
    eco: 'B90',
    nameRu: 'Сицилианская защита',
    variationRu: 'Вариант Найдорфа, 6. Сe3 e5',
    side: 'white',
    wins: 19,
    draws: 5,
    losses: 18,
    avgEvalDropCp: 142,
    avgMoveTimeSec: 18.6,
    criticalPly: 15,
    criticalMoveSan: '8. Сc4?!',
    blindSpotReasonRu: 'Слепая зона: после 7...Сe6 вы тратите в среднем 18.6с и допускаете 8. Сc4?! вместо 8. f3 с потерей темпа.',
    sampleFen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 2 6',
    evalCpAfterMistake: -115,
    bestReplySan: '8. f3!',
  },
  {
    id: 'eco-c65',
    eco: 'C65',
    nameRu: 'Испанская партия',
    variationRu: 'Берлинская защита, 4. d3 Сc5',
    side: 'white',
    wins: 38,
    draws: 11,
    losses: 9,
    avgEvalDropCp: 34,
    avgMoveTimeSec: 6.2,
    criticalPly: 18,
    criticalMoveSan: '9. Кbd2',
    blindSpotReasonRu: 'Стабильный анти-Берлин: высокая точность перегруппировки Кb1-d2-f1-g3.',
    sampleFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/1PB1P3/3P1N2/P1P2PPP/RNBQK2R b KQkq - 0 5',
    evalCpAfterMistake: 45,
    bestReplySan: '9. c3',
  },
  {
    id: 'eco-c50',
    eco: 'C50',
    nameRu: 'Итальянская партия',
    variationRu: 'Giuoco Pianissimo, 6. d3 d6',
    side: 'white',
    wins: 29,
    draws: 7,
    losses: 8,
    avgEvalDropCp: 41,
    avgMoveTimeSec: 7.4,
    criticalPly: 21,
    criticalMoveSan: '11. h3',
    blindSpotReasonRu: 'Отличный контроль центра и своевременная профилактика связки Сg4.',
    sampleFen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq - 0 6',
    evalCpAfterMistake: 55,
    bestReplySan: '11. Лe1',
  },
  {
    id: 'eco-e60',
    eco: 'E60',
    nameRu: 'Староиндийская защита',
    variationRu: 'Классическая система, 7...Кc6 8. d5',
    side: 'black',
    wins: 14,
    draws: 4,
    losses: 19,
    avgEvalDropCp: 168,
    avgMoveTimeSec: 21.4,
    criticalPly: 18,
    criticalMoveSan: '9...Кd4??',
    blindSpotReasonRu: 'Критическая слепая зона: преждевременный прыжок 9...Кd4 вместо 9...Кe7 приводит к потере пешки после размена на d4.',
    sampleFen: 'r1bq1rk1/ppp1ppbp/2np1np1/3P4/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 0 8',
    evalCpAfterMistake: 195,
    bestReplySan: '9...Кe7!',
  },
  {
    id: 'eco-b12',
    eco: 'B12',
    nameRu: 'Защита Каро-Канн',
    variationRu: 'Закрытый вариант, 3. e5 Сf5 4. Кf3',
    side: 'black',
    wins: 31,
    draws: 9,
    losses: 10,
    avgEvalDropCp: 38,
    avgMoveTimeSec: 5.8,
    criticalPly: 16,
    criticalMoveSan: '8...c5',
    blindSpotReasonRu: 'Надежный подрыв центра c5 с отличным балансом времени.',
    sampleFen: 'rn1qkbnr/pp2pppp/2p5/3pPb2/3P4/5N2/PPP2PPP/RNBQKB1R b KQkq - 1 4',
    evalCpAfterMistake: -10,
    bestReplySan: '8...c5!',
  },
  {
    id: 'eco-d37',
    eco: 'D37',
    nameRu: 'Ферзевый гамбит',
    variationRu: 'Венский вариант, 5. Сf4 O-O 6. e3 c5',
    side: 'black',
    wins: 11,
    draws: 6,
    losses: 15,
    avgEvalDropCp: 118,
    avgMoveTimeSec: 16.2,
    criticalPly: 14,
    criticalMoveSan: '7...cxd4?!',
    blindSpotReasonRu: 'Слепая зона: раннее вскрытие линии «c» до развития коня b8 дает белым сильное давление на d5.',
    sampleFen: 'rnbq1rk1/ppp2ppp/4pn2/2pp4/2PP1B2/2N1P3/PP3PPP/R2QKBNR b KQ - 1 6',
    evalCpAfterMistake: 110,
    bestReplySan: '7...Кc6!',
  },
];

export const TIME_HEATMAP_BUCKETS: TimeMoveBucketDto[] = [
  { moveNumber: 4, avgSecondsSpent: 2.1, remainingClockSec: 175, accuracyPct: 98.2, stage: 'opening', sampleSan: '4. Сb5' },
  { moveNumber: 8, avgSecondsSpent: 19.4, remainingClockSec: 148, accuracyPct: 76.5, stage: 'opening', sampleSan: '8. Сc4?!' },
  { moveNumber: 12, avgSecondsSpent: 7.8, remainingClockSec: 126, accuracyPct: 92.1, stage: 'opening', sampleSan: '12. Лfe1' },
  { moveNumber: 16, avgSecondsSpent: 24.6, remainingClockSec: 94, accuracyPct: 71.4, stage: 'middlegame', sampleSan: '16. Кd5?!' },
  { moveNumber: 20, avgSecondsSpent: 11.2, remainingClockSec: 72, accuracyPct: 89.6, stage: 'middlegame', sampleSan: '20. Фe2' },
  { moveNumber: 24, avgSecondsSpent: 28.5, remainingClockSec: 41, accuracyPct: 68.0, stage: 'middlegame', sampleSan: '24. g4??' },
  { moveNumber: 28, avgSecondsSpent: 8.4, remainingClockSec: 29, accuracyPct: 90.4, stage: 'middlegame', sampleSan: '28. Лad1' },
  { moveNumber: 32, avgSecondsSpent: 1.4, remainingClockSec: 19, accuracyPct: 64.2, stage: 'endgame', sampleSan: '32. Лd7??' },
  { moveNumber: 36, avgSecondsSpent: 1.1, remainingClockSec: 12, accuracyPct: 69.8, stage: 'endgame', sampleSan: '36. Крf2?!' },
  { moveNumber: 40, avgSecondsSpent: 3.8, remainingClockSec: 8, accuracyPct: 91.5, stage: 'endgame', sampleSan: '40. Лc8+' },
];

export const STAGE_ACCURACY_SUMMARY: StageAccuracyDto[] = [
  {
    stage: 'opening',
    labelRu: 'Дебют (ходы 1–12)',
    avgSecPerMove: 6.4,
    accuracyPct: 92.8,
    blundersPer100Moves: 1.2,
    optimalPaceRangeSec: '3.5 – 8.0 сек',
  },
  {
    stage: 'middlegame',
    labelRu: 'Миттельшпиль (ходы 13–28)',
    avgSecPerMove: 15.8,
    accuracyPct: 84.3,
    blundersPer100Moves: 4.7,
    optimalPaceRangeSec: '8.0 – 14.0 сек',
  },
  {
    stage: 'endgame',
    labelRu: 'Эндшпиль (ходы 29+)',
    avgSecPerMove: 2.3,
    accuracyPct: 78.6,
    blundersPer100Moves: 7.4,
    optimalPaceRangeSec: '3.0 – 6.5 сек',
  },
];

export const TACTICAL_MISTAKE_PATTERNS: TacticalMistakePatternDto[] = [
  {
    motif: 'missed_pin',
    titleRu: 'Пропущенная связка (Pin)',
    descriptionRu: 'Игнорирование рентгена слона или ладьи по диагонали a4–e8 / вертикали e.',
    occurrencesLast30Days: 14,
    avgCentipawnLoss: 245,
    severity: 'critical',
  },
  {
    motif: 'knight_fork',
    titleRu: 'Коневая вилка (Knight Fork)',
    descriptionRu: 'Пропуск вторжения коня на поля c7, f7 или d3 в цейтноте.',
    occurrencesLast30Days: 11,
    avgCentipawnLoss: 310,
    severity: 'critical',
  },
  {
    motif: 'overload',
    titleRu: 'Перегрузка защитника (Overload)',
    descriptionRu: 'Одна фигура одновременно защищает матовое поле и ключевую пешку центра.',
    occurrencesLast30Days: 8,
    avgCentipawnLoss: 190,
    severity: 'high',
  },
  {
    motif: 'back_rank',
    titleRu: 'Мат по 1-й / 8-й горизонтали',
    descriptionRu: 'Отсутствие «форточки» (h3 / g6) при тяжелых фигурах на открытых линиях.',
    occurrencesLast30Days: 6,
    avgCentipawnLoss: 650,
    severity: 'high',
  },
  {
    motif: 'hanging_piece',
    titleRu: 'Незащищенная фигура в цейтноте',
    descriptionRu: 'Импульсивные ходы быстрее 1.5 сек при остатке менее 20 сек на часах.',
    occurrencesLast30Days: 5,
    avgCentipawnLoss: 280,
    severity: 'moderate',
  },
];

export const PERSONAL_MISTAKE_PUZZLES: PersonalPuzzleDto[] = [
  {
    id: 'puz-pin-01',
    motif: 'missed_pin',
    motifLabelRu: 'Связка по диагонали',
    gameOpponent: 'NordicKnight',
    gameRating: 2135,
    datePlayed: 'Вчера · Blitz 3+0',
    eco: 'C65',
    initialFen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6',
    playerColor: 'white',
    blunderMovePlayedSan: '6. Кg5?!',
    solutionUci: 'c1g5',
    solutionSan: 'Сg5!',
    fromSquare: 'c1',
    toSquare: 'g5',
    explanationRu: 'В партии вы сыграли 6. Кg5?! и попали под 6...d5. Жесткая связка 6. Сg5! сковывает коня f6 и дает белым стойкий перевес.',
    evalBefore: '+0.2',
    evalAfter: '+1.6',
  },
  {
    id: 'puz-fork-02',
    motif: 'knight_fork',
    motifLabelRu: 'Коневая вилка на f7',
    gameOpponent: 'SicilianMaster',
    gameRating: 2148,
    datePlayed: '2 дня назад · Blitz 3+2',
    eco: 'C57',
    initialFen: 'r1bqkb1r/pppp1ppp/2n5/4p1N1/2B1n3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    playerColor: 'white',
    blunderMovePlayedSan: '5. Сxf7+?',
    solutionUci: 'g5f7',
    solutionSan: 'Кxf7!',
    fromSquare: 'g5',
    toSquare: 'f7',
    explanationRu: 'Двойной удар конем 5. Кxf7! выигрывает качество или заставляет черных отдать ферзя за две легкие фигуры.',
    evalBefore: '+0.4',
    evalAfter: '+2.9',
  },
  {
    id: 'puz-overload-03',
    motif: 'overload',
    motifLabelRu: 'Перегрузка защитника f7',
    gameOpponent: 'TacticWolf',
    gameRating: 2110,
    datePlayed: '4 дня назад · Rapid 10+0',
    eco: 'B90',
    initialFen: '2rq1rk1/pb1nbppp/1p2pn2/8/2BNP3/2N1B3/PPQ2PPP/2KR3R w - - 4 12',
    playerColor: 'white',
    blunderMovePlayedSan: '12. Крb1?!',
    solutionUci: 'd4e6',
    solutionSan: 'Кxe6!',
    fromSquare: 'd4',
    toSquare: 'e6',
    explanationRu: 'Пешка f7 перегружена! Жертва 12. Кxe6! fxe6 13. Сxe6+ Крh8 14. Сxd7 разрушает прикрытие короля и выигрывает фигуру.',
    evalBefore: '+0.3',
    evalAfter: '+3.8',
  },
  {
    id: 'puz-backrank-04',
    motif: 'back_rank',
    motifLabelRu: 'Удар по 8-й горизонтали',
    gameOpponent: 'DarkSquare99',
    gameRating: 2160,
    datePlayed: '5 дней назад · Blitz 3+0',
    eco: 'D37',
    initialFen: '3r2k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 30',
    playerColor: 'white',
    blunderMovePlayedSan: '30. g3?',
    solutionUci: 'c1c8',
    solutionSan: 'Лc8#',
    fromSquare: 'c1',
    toSquare: 'c8',
    explanationRu: 'Мгновенный мат по 8-й горизонтали 30. Лc8+! Черная ладья на d8 не может помешать форсированному мату.',
    evalBefore: '+0.0',
    evalAfter: 'M1',
  },
];

export const POST_GAME_ANALYSIS_MOVES: AnalyzedPlyDto[] = [
  {
    plyIndex: 0,
    moveNumber: 15,
    side: 'white',
    san: '15. Сd3',
    from: 'f1',
    to: 'd3',
    fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/2BNP3/2NB4/PPPQ1PPP/2KR3R b - - 3 15',
    evalCp: 45,
    whiteClockMs: 142_000,
    blackClockMs: 138_000,
    moveTimeSec: 4.2,
    classification: 'book',
    commentRu: 'Гармоничное завершение развития белых фигур.',
  },
  {
    plyIndex: 1,
    moveNumber: 18,
    side: 'black',
    san: '18... Лаc8??',
    from: 'a8',
    to: 'c8',
    fen: '2rq1rk1/pb1nbppp/1p2pn2/8/2BNP3/2N1B3/PPQ2PPP/2KR3R w - - 4 19',
    evalCp: 285,
    whiteClockMs: 112_000,
    blackClockMs: 84_000,
    moveTimeSec: 21.4,
    classification: 'blunder',
    commentRu: 'Критическая ошибка! Черные оставили пешку e6 и пункт f7 под рентгеном слона c4.',
  },
  {
    plyIndex: 2,
    moveNumber: 23,
    side: 'white',
    san: '23. Кd5!',
    from: 'c3',
    to: 'd5',
    fen: '2rq1rk1/pb1nbppp/1p2pn2/3N4/2B1P3/4B3/PPQ2PPP/2KR3R b - - 5 23',
    evalCp: 360,
    whiteClockMs: 68_000,
    blackClockMs: 42_000,
    moveTimeSec: 12.8,
    classification: 'great',
    commentRu: 'Переломный момент партии: централизация коня с неотразимым давлением на e7 и f6.',
  },
  {
    plyIndex: 3,
    moveNumber: 27,
    side: 'white',
    san: '27. Лxf7+!!',
    from: 'f1',
    to: 'f7',
    fen: '2rq2k1/pb1nbRpp/1p2pn2/3N4/2B1P3/4B3/PPQ3PP/2KR4 b - - 0 27',
    evalCp: 780,
    mate: 4,
    whiteClockMs: 24_800,
    blackClockMs: 9_400,
    moveTimeSec: 6.1,
    classification: 'brilliant',
    commentRu: 'Бриллиантовый тактический удар! Жертва ладьи на f7 вскрывает короля черных с форсированным матом в 4 хода.',
  },
  {
    plyIndex: 4,
    moveNumber: 28,
    side: 'black',
    san: '28... Крxf7',
    from: 'g8',
    to: 'f7',
    fen: '2rq4/pb1nbkpp/1p2pn2/3N4/2B1P3/4B3/PPQ3PP/2KR4 w - - 0 28',
    evalCp: 890,
    mate: 3,
    whiteClockMs: 24_800,
    blackClockMs: 6_200,
    moveTimeSec: 3.2,
    classification: 'inaccuracy',
    commentRu: 'Черный король вынужден выйти в центр под перекрестный огонь.',
  },
];

export const CRITICAL_MOMENTS_CARDS: CriticalMomentDto[] = [
  {
    id: 'cm-blunder',
    kind: 'critical_blunder',
    badgeRu: 'Критическая ошибка',
    plyIndex: 1,
    moveNumber: 18,
    san: '18... Лаc8??',
    prevSan: '18. Фc2',
    evalBeforeCp: 35,
    evalAfterCp: 285,
    bestEngineMoveSan: '18... Кc5!',
    summaryRu: 'Потеря +2.5 пешки: ослабление прикрытия пункта e6 позволяет белым нанести удар Кxe6.',
  },
  {
    id: 'cm-turning',
    kind: 'turning_point',
    badgeRu: 'Переломный момент',
    plyIndex: 2,
    moveNumber: 23,
    san: '23. Кd5!',
    prevSan: '22... Сb7',
    evalBeforeCp: 140,
    evalAfterCp: 360,
    bestEngineMoveSan: '23. Кd5!',
    summaryRu: 'Доминация в центре: вскрывает диагональ a2–g8 и связывает защитников королевского фланга.',
  },
  {
    id: 'cm-brilliant',
    kind: 'best_tactical_strike',
    badgeRu: 'Лучший тактический удар',
    plyIndex: 3,
    moveNumber: 27,
    san: '27. Лxf7+!!',
    prevSan: '26... Кfd7',
    evalBeforeCp: 360,
    evalAfterCp: 780,
    bestEngineMoveSan: '27. Лxf7+!!',
    summaryRu: 'Форсированный мат М4: жертва ладьи разрушает пешечный щит черного короля.',
  },
];
