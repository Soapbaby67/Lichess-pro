import React, { useState, useRef } from 'react';
import {
  BoardThemeId,
  BoardSquarePiece,
  parseFenToBoard,
  coordsToSquare,
  getPseudoLegalTargets,
  computeEvalBarPercentage,
  formatEvalBadge,
  classifyClockUrgency,
  formatClockTime,
} from '../logic/chessAnalytics';

export interface BoardThemeSpec {
  id: BoardThemeId;
  labelRu: string;
  lightSquare: string;
  darkSquare: string;
  lastMoveBg: string;
  selectedBg: string;
  dotColorRgb: string;
  coordColor: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeSpec> = {
  oled_minimalist: {
    id: 'oled_minimalist',
    labelRu: 'OLED Minimalist',
    lightSquare: '#323238',
    darkSquare: '#1A1A1F',
    lastMoveBg: 'rgba(16, 185, 129, 0.30)',
    selectedBg: 'rgba(217, 119, 6, 0.42)',
    dotColorRgb: '16, 185, 129',
    coordColor: '#A1A1AA',
  },
  slate_grey: {
    id: 'slate_grey',
    labelRu: 'Slate Grey',
    lightSquare: '#64748B',
    darkSquare: '#334155',
    lastMoveBg: 'rgba(245, 158, 11, 0.36)',
    selectedBg: 'rgba(56, 189, 248, 0.42)',
    dotColorRgb: '248, 250, 252',
    coordColor: '#E2E8F0',
  },
  wood_classic: {
    id: 'wood_classic',
    labelRu: 'Wood Classic',
    lightSquare: '#D6B485',
    darkSquare: '#8B5A2B',
    lastMoveBg: 'rgba(250, 204, 21, 0.38)',
    selectedBg: 'rgba(16, 185, 129, 0.42)',
    dotColorRgb: '24, 24, 27',
    coordColor: '#FDE68A',
  },
};

function ChessPieceSvg({ piece }: { piece: BoardSquarePiece }) {
  const isWhite = piece.color === 'w';
  const fill = isWhite ? '#F8FAFC' : '#272B33';
  const stroke = isWhite ? '#18181B' : '#F1F5F9';

  switch (piece.type) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none">
          <path
            d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21 15.5,24 15.5,28 L 29.5,28 C 29.5,24 27.5,21 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z M 12.5,32 L 32.5,32 L 34,36.5 L 11,36.5 L 12.5,32 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'r':
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none">
          <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
          </g>
        </svg>
      );
    case 'n':
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none">
          <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
            <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
          </g>
        </svg>
      );
    case 'b':
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none">
          <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.06 9,36 9,36 z" />
            <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
            <circle cx="22.5" cy="8" r="2.2" />
          </g>
        </svg>
      );
    case 'q':
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none">
          <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
            <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
          </g>
        </svg>
      );
    case 'k':
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none">
          <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6" />
            <path d="M 20,8 L 25,8" />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
            <path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,29.5 L 11.5,37 z" />
          </g>
        </svg>
      );
  }
}

export function SmoothedEvalBarWidget({
  evalCp,
  mate,
  flipped,
}: {
  evalCp: number;
  mate?: number;
  flipped?: boolean;
}) {
  const whitePct = computeEvalBarPercentage({ cp: evalCp, mate });
  const effectiveWhitePct = flipped ? 100 - whitePct : whitePct;
  const badgeText = formatEvalBadge({ cp: evalCp, mate });
  const isWhiteAdvantage = (mate !== undefined ? mate > 0 : evalCp >= 0);

  return (
    <div
      className="relative w-8 sm:w-9 self-stretch rounded-lg bg-[#161618] border border-[#2C2C2E] overflow-hidden flex flex-col justify-end select-none shrink-0"
      aria-label={`Оценка Stockfish ${badgeText}`}
    >
      <div
        className="w-full bg-[#E5E7EB] transition-all duration-500 ease-in-out"
        style={{ height: `${effectiveWhitePct}%` }}
      />
      <div
        className={`absolute left-0.5 right-0.5 px-0.5 py-0.5 rounded text-[10px] font-mono font-bold text-center leading-tight ${
          isWhiteAdvantage
            ? 'bottom-1.5 bg-[#121212]/85 text-[#F3F4F6]'
            : 'top-1.5 bg-[#F3F4F6]/90 text-[#121212]'
        }`}
      >
        {badgeText}
      </div>
    </div>
  );
}

export function AdaptiveChessClockWidget({
  playerName,
  rating,
  remainingMs,
  isActive,
  sideLabel,
}: {
  playerName: string;
  rating: number;
  remainingMs: number;
  isActive: boolean;
  sideLabel: string;
}) {
  const urgency = classifyClockUrgency(remainingMs);
  const formatted = formatClockTime(remainingMs);

  const urgencyStyles =
    urgency === 'critical'
      ? 'bg-[#451A1A] border-[#EF4444] text-[#FCA5A5] animate-pulse-urgent'
      : urgency === 'warning'
        ? 'bg-[#422006] border-[#D97706] text-[#FDE68A]'
        : 'bg-[#1E1E1E] border-[#2E2E32] text-[#F3F4F6]';

  const urgencyLabel =
    urgency === 'critical'
      ? 'ЦЕЙТНОТ < 10С'
      : urgency === 'warning'
        ? 'ВНИМАНИЕ < 30С'
        : isActive
          ? 'ХОД ИГРОКА'
          : 'ОЖИДАНИЕ';

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2E]">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F4F6] truncate">
          <span>{playerName}</span>
          <span className="text-xs font-mono text-[#9CA3AF]">({rating})</span>
        </div>
        <div className="text-[11px] text-[#9CA3AF] mt-0.5">
          {sideLabel} · {urgencyLabel}
        </div>
      </div>

      <div
        className={`px-3.5 py-1.5 rounded-lg border font-mono text-xl sm:text-2xl font-bold tracking-tight tabular-nums transition-colors ${urgencyStyles}`}
      >
        {formatted}
      </div>
    </div>
  );
}

interface InteractiveChessboardProps {
  fen: string;
  themeId: BoardThemeId;
  legalDotOpacity: number;
  lastMoveFrom?: string;
  lastMoveTo?: string;
  flipped?: boolean;
  onMakeUciMove?: (uci: string, fromSq: string, toSq: string) => void;
  onSwipeStep?: (direction: 'prev' | 'next') => void;
  onSwipeDownQuickActions?: () => void;
}

export function InteractiveChessboard({
  fen,
  themeId,
  legalDotOpacity,
  lastMoveFrom,
  lastMoveTo,
  flipped = false,
  onMakeUciMove,
  onSwipeStep,
  onSwipeDownQuickActions,
}: InteractiveChessboardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const theme = BOARD_THEMES[themeId];
  const board = parseFenToBoard(fen);
  const legalTargets = selectedSquare ? getPseudoLegalTargets(fen, selectedSquare) : [];

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const handleSquareClick = (sq: string, piece: BoardSquarePiece | null) => {
    if (selectedSquare && selectedSquare !== sq && legalTargets.includes(sq)) {
      const uci = `${selectedSquare}${sq}`;
      setSelectedSquare(null);
      onMakeUciMove?.(uci, selectedSquare, sq);
      return;
    }

    if (piece) {
      setSelectedSquare((prev) => (prev === sq ? null : sq));
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;

    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) {
        onSwipeStep?.('next');
      } else {
        onSwipeStep?.('prev');
      }
    } else if (dy > 75 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      onSwipeDownQuickActions?.();
    }
  };

  return (
    <div
      data-testid="interactive-chessboard"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="relative aspect-square w-full max-w-[440px] rounded-xl overflow-hidden border border-[#2E2E32] shadow-xl select-none touch-pan-y"
    >
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {rows.map((r, rIdx) =>
          cols.map((c, cIdx) => {
            const sq = coordsToSquare(r, c);
            const piece = board[r]?.[c] ?? null;
            const isLight = (r + c) % 2 === 0;
            const isLastMove = sq === lastMoveFrom || sq === lastMoveTo;
            const isSelected = sq === selectedSquare;
            const isLegalTarget = legalTargets.includes(sq);

            const baseBg = isLight ? theme.lightSquare : theme.darkSquare;
            const fileLabel = String.fromCharCode('a'.charCodeAt(0) + c);
            const rankLabel = String(8 - r);

            return (
              <button
                key={sq}
                type="button"
                aria-label={`Поле ${sq}${piece ? ` фигура ${piece.color}${piece.type}` : ''}`}
                onClick={() => handleSquareClick(sq, piece)}
                style={{ backgroundColor: baseBg }}
                className="relative flex items-center justify-center w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] transition-colors duration-200"
              >
                {/* Soft last-move highlight */}
                {isLastMove && (
                  <span
                    className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: theme.lastMoveBg }}
                  />
                )}

                {/* Selected square highlight */}
                {isSelected && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: theme.selectedBg }}
                  />
                )}

                {/* Rank coordinate on left file */}
                {cIdx === 0 && (
                  <span
                    style={{ color: theme.coordColor }}
                    className="absolute top-0.5 left-1 text-[10px] font-mono font-semibold leading-none pointer-events-none opacity-80"
                  >
                    {rankLabel}
                  </span>
                )}

                {/* File coordinate on bottom rank */}
                {rIdx === 7 && (
                  <span
                    style={{ color: theme.coordColor }}
                    className="absolute bottom-0.5 right-1 text-[10px] font-mono font-semibold leading-none pointer-events-none opacity-80"
                  >
                    {fileLabel}
                  </span>
                )}

                {/* Chess Piece */}
                {piece && (
                  <span className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-150 active:scale-105">
                    <ChessPieceSvg piece={piece} />
                  </span>
                )}

                {/* Legal move dot / capture ring with configurable opacity */}
                {isLegalTarget && (
                  <span
                    className="absolute z-20 pointer-events-none flex items-center justify-center inset-0"
                    style={{ opacity: legalDotOpacity }}
                  >
                    {piece ? (
                      <span
                        className="w-4/5 h-4/5 rounded-full border-[3px]"
                        style={{ borderColor: `rgb(${theme.dotColorRgb})` }}
                      />
                    ) : (
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: `rgb(${theme.dotColorRgb})` }}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
