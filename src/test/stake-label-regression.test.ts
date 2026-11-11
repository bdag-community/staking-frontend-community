import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
it('associates the stake amount label with its stable input id',()=>{
 const source=readFileSync(resolve('src/components/ui/StakeModal.tsx'),'utf8');
 expect(source).toMatch(/htmlFor=\{amountInputId\}/);
 expect(source).toMatch(/id=\{amountInputId\}/);
});
it('uses bounded wallet RPC batches rather than dozens of redundant identity checks',()=>{
 const source=readFileSync(resolve('src/config/reown.ts'),'utf8');
 expect(source).toMatch(/batch:\s*\{\s*batchSize:\s*20,\s*wait:\s*10\s*\}/);
 expect(source).toMatch(/retryCount:\s*0/);
});
it('gives the stake review dialog a useful screen-reader description',()=>{
 const source=readFileSync(resolve('src/components/ui/StakeModal.tsx'),'utf8');
 expect(source).toMatch(/<DialogDescription[^>]*>Review the amount, pool terms and waiting periods before confirming\./);
});
