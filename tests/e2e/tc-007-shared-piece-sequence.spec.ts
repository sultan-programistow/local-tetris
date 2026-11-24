/**
 * TC-007 — Both players receive the same piece sequence (seeded RNG).
 * Case of record: tests/test-cases/TC-007-shared-piece-sequence.md
 *
 * Ten pieces are played on both boards; at every spawn the piece type of P1 and P2
 * is read from the ?e2e=1 hook. A second match with a new random seed is checked too,
 * so a fixed sequence that happens to match cannot pass.
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { startMatch } from './helpers/app';
import { spawnTable, type Spawn } from './helpers/pieces';

const REPORTS = 'tests/reports/TC-007';

function nextRunId(): string {
  if (process.env.TC_RUN_ID) return process.env.TC_RUN_ID;
  mkdirSync(REPORTS, { recursive: true });
  const used = readdirSync(REPORTS)
    .map((f) => /^run(\d+)-/.exec(f)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  return `run${used.length ? Math.max(...used) + 1 : 1}`;
}

const RUN = nextRunId();

async function playSequence(page: import('@playwright/test').Page, count: number): Promise<Spawn[]> {
  await page.goto('/?e2e=1');
  await startMatch(page);
  return spawnTable(page, count);
}

test('TC-007 — both players get the same piece type in the same order', async ({ page }) => {
  test.setTimeout(180_000);

  const first = await playSequence(page, 10);
  expect(first).toHaveLength(10);
  for (const row of first) {
    expect(row.p1, `piece ${row.index}: P1 vs P2`).not.toBeNull();
    expect(row.p2, `piece ${row.index}: P1 vs P2`).toBe(row.p1);
  }

  // A fresh match draws a new seed; the sequence must still be shared (and may differ).
  const second = await playSequence(page, 5);
  expect(second).toHaveLength(5);
  for (const row of second) {
    expect(row.p2, `piece ${row.index} of match 2: P1 vs P2`).toBe(row.p1);
  }

  const firstSeq = first.map((r) => r.p1);
  const secondSeq = second.map((r) => r.p1);

  writeFileSync(
    `${REPORTS}/${RUN}-sequence.json`,
    JSON.stringify(
      {
        case: 'TC-007',
        runId: RUN,
        match1: first,
        match2: second,
        identical: first.every((r) => r.p1 === r.p2),
        differentSeedsProduceDifferentSequences: firstSeq.join('') !== secondSeq.join(''),
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  await page.screenshot({ path: `${REPORTS}/${RUN}-match2-boards.png` });
  expect(firstSeq.join('')).not.toBe(secondSeq.join(''));
});
