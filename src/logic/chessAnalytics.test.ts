import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWinDrawLossPercentages,
  detectOpeningBlindSpots,
  classifyMoveTimeAnomaly,
  computeEvalBarPercentage,
  classifyClockUrgency,
  formatClockTime,
  parseFenToBoard,
  applyUciMoveToFen,
  OPENING_REPERTOIRE_DATA,
} from './chessAnalytics';

test('computeWinDrawLossPercentages sums to 100% and handles empty games', () => {
  const res = computeWinDrawLossPercentages(19, 5, 18);
  assert.equal(res.totalGames, 42);
  assert.equal(Math.round((res.winPct + res.drawPct + res.lossPct) * 10) / 10, 100);

  const empty = computeWinDrawLossPercentages(0, 0, 0);
  assert.equal(empty.totalGames, 0);
  assert.equal(empty.winPct, 0);
});

test('detectOpeningBlindSpots filters and orders openings by centipawn loss and time', () => {
  const blindSpots = detectOpeningBlindSpots(OPENING_REPERTOIRE_DATA, 100, 15);
  assert.equal(blindSpots.length, 3);
  assert.equal(blindSpots[0].eco, 'E60');
  assert.equal(blindSpots[1].eco, 'B90');
  assert.equal(blindSpots[2].eco, 'D37');
});

test('classifyMoveTimeAnomaly identifies deep think and impulse zeitnot', () => {
  assert.equal(classifyMoveTimeAnomaly(24.5, 90), 'deep_think');
  assert.equal(classifyMoveTimeAnomaly(1.2, 18), 'impulse_zeitnot');
  assert.equal(classifyMoveTimeAnomaly(6.5, 85), 'normal');
});

test('computeEvalBarPercentage maps centipawns and mate scores accurately', () => {
  assert.equal(computeEvalBarPercentage({ cp: 0 }), 50);
  assert.ok(computeEvalBarPercentage({ cp: 300 }) > 70);
  assert.ok(computeEvalBarPercentage({ cp: -300 }) < 30);
  assert.equal(computeEvalBarPercentage({ mate: 4 }), 97);
  assert.equal(computeEvalBarPercentage({ mate: -2 }), 3);
});

test('classifyClockUrgency and formatClockTime follow <30s and <10s rules', () => {
  assert.equal(classifyClockUrgency(45_000), 'normal');
  assert.equal(classifyClockUrgency(24_800), 'warning');
  assert.equal(classifyClockUrgency(6_400), 'critical');
  assert.equal(formatClockTime(142_000), '02:22');
  assert.equal(formatClockTime(9_400), '00:09.4');
});

test('parseFenToBoard and applyUciMoveToFen update board state and detect captures', () => {
  const startFen = 'r1bqkb1r/pppp1ppp/2n5/4p1N1/2B1n3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5';
  const board = parseFenToBoard(startFen);
  assert.equal(board[3][6]?.type, 'n'); // g5 knight
  assert.equal(board[1][5]?.type, 'p'); // f7 pawn

  const result = applyUciMoveToFen(startFen, 'g5f7');
  assert.equal(result.captured, true);
  const nextBoard = parseFenToBoard(result.nextFen);
  assert.equal(nextBoard[1][5]?.type, 'n');
  assert.equal(nextBoard[1][5]?.color, 'w');
  assert.equal(nextBoard[3][6], null);
});
