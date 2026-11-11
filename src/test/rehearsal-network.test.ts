import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
describe('separate legacy rehearsal presentation',()=>{
 it('routes an isolated build under its configured base without changing root builds',()=>{
  expect(readFileSync('src/App.tsx','utf8')).toContain('basename={import.meta.env.BASE_URL}');
  expect(readFileSync('vite.config.ts','utf8')).toContain('NEXT_PUBLIC_APP_BASE_PATH');
 });
 it('clearly labels simulated legacy history and does not claim it is mainnet migration',()=>{
  const source=readFileSync('src/pages/PlatformPages.tsx','utf8');
  expect(source).toContain('ENV.LEGACY_REHEARSAL');
  expect(source).toContain('not a mainnet migration');
  expect(source).not.toContain('even though both use chain ID 8008');
 });
});
