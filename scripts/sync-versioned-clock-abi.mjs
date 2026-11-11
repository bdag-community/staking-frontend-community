import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Separate candidate interface. Never regenerate the shipped historical ABIs.
const source = new URL('../../Contract-Staking/out/testnet-timing-v1-candidate/runtime-bundle.json', import.meta.url);
const raw = await readFile(source);
const sha256 = createHash('sha256').update(raw).digest('hex');
if (sha256 !== 'b8d100d8c69746070d02b497ee3e4c2837f9020981d036eff7d5a94ef61a5275') throw new Error('Unreviewed timing candidate ABI bundle');
const row = JSON.parse(raw).runtimes.find(row => row.contract === 'VersionedChainTallyReader');
if (!Array.isArray(row?.abi) || !row.abi.some(item => item.name === 'epochBounds')) throw new Error('Missing compiled epoch clock interface');
const destination = new URL('../src/contract/versioned-chain-tally-reader-abi.ts', import.meta.url);
await writeFile(destination, `// GENERATED from candidate runtime bundle SHA-256 ${sha256}.\n// Interface only; does not enable or install the candidate.\nexport const versionedChainTallyReaderAbi = ${JSON.stringify(row.abi, null, 2)} as const;\n`);
console.log(fileURLToPath(destination));
