#!/usr/bin/env node
/**
 * Test entry point: npm run test [TC-### ...] [extra playwright args]
 *
 *   npm run test            -> every automated case
 *   npm run test TC-001     -> only TC-001
 *   npm run test TC-001 -- --headed
 *
 * Cases without a spec are reported, not silently skipped.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const E2E_DIR = 'tests/e2e';
const CASE_RE = /^TC-\d+$/i;

const args = process.argv.slice(2);
const caseIds = args.filter((a) => CASE_RE.test(a)).map((a) => a.toUpperCase());
const passthrough = args.filter((a) => !CASE_RE.test(a));

if (!existsSync(E2E_DIR)) {
  console.error(`No ${E2E_DIR} directory.`);
  process.exit(2);
}

const specs = readdirSync(E2E_DIR).filter((f) => f.endsWith('.spec.ts'));
let targets = specs;
let missing = 0;

if (caseIds.length) {
  targets = [];
  for (const id of caseIds) {
    const hit = specs.filter((f) => f.toUpperCase().startsWith(`${id}-`));
    if (hit.length === 0) {
      console.error(`${id}: no automated spec yet (only the manual case in tests/test-cases/)`);
      missing++;
    }
    targets.push(...hit);
  }
  if (missing) {
    console.error(`${missing} of ${caseIds.length} requested case(s) are not automated.`);
    if (targets.length === 0) process.exit(3);
  }
}

if (targets.length === 0) {
  console.error('No specs to run.');
  process.exit(2);
}

const bin = join('node_modules', '.bin', 'playwright');
const res = spawnSync(bin, ['test', ...targets, ...passthrough], { stdio: 'inherit' });

if (res.error) {
  console.error(`Failed to start Playwright: ${res.error.message}`);
  process.exit(1);
}
process.exit(res.status ?? 1);
