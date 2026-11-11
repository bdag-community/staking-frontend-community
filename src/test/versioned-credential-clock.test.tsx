import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, expect, it, vi } from 'vitest';
import { keccak256 } from 'viem';
import { useCredentialContract } from '@/hooks/use-credential-contract';

const m = vi.hoisted(() => ({ read: vi.fn(), code: vi.fn(), hash: '', legacy: '0x0000000000000000000000000000000000000004' }));
const account = '0x0000000000000000000000000000000000000001';
vi.mock('@/hooks/use-wallet', () => ({ useWallet: () => ({ address: account, isConnected: true }) }));
vi.mock('@/hooks/use-wallet-network-validation', () => ({ useWalletNetworkValidation: () => ({}) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/config/env', () => ({ ENV: { CHAIN: {
  STAKING_CREDENTIAL_ADDRESS: '0x0000000000000000000000000000000000000002',
  STAKING_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000004',
  get STAKING_V1_ADDRESS() { return m.legacy; },
  READER_ADDRESS: '0x1000000000000000000000000000000000000002',
  EPOCH_CLOCK_INTERFACE: '3', get EPOCH_READER_CODE_HASH() { return m.hash; },
} } }));
vi.mock('@/config/reown', () => ({ blockdagTestnet: { id: 1043 }, wagmiAdapter: { wagmiConfig: {} } }));
vi.mock('@/utils/contract-calls', () => ({ readContractWithRetry: m.read }));
vi.mock('@wagmi/core', () => ({ getBlockNumber: vi.fn().mockResolvedValue(100n), getBlock: vi.fn().mockResolvedValue({ number: 100n, timestamp: 7400n, hash: '0x'+'ab'.repeat(32) }), getBytecode: m.code, readContract: vi.fn(), simulateContract: vi.fn(), switchChain: vi.fn(), waitForTransactionReceipt: vi.fn(), writeContract: vi.fn() }));
const use = () => renderHook(() => useCredentialContract(), { wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig> });
beforeEach(() => {
  m.legacy='0x0000000000000000000000000000000000000004';
  m.hash = keccak256('0x6000');
  m.code.mockReset().mockResolvedValue('0x6000');
  m.read.mockReset().mockImplementation(async (_config, args) => ({ poolsOf: [], poolTotalShares: 0n, currentEpoch: 101n, votingReady: true, rawWeightOf: 100n, balanceOf: 0n, delegateAt: account, isDelegate: false, totalSupplyAt: 1000n, epochDuration: 1800n, genesisTime: 1000n,
    clockSource: '0x0000000000000000000000000000000000000004',
    epochBounds: { epoch: 101n, version: 2n, start: 7000n, end: 8800n, duration: 1800n },
  })[args.functionName]);
});
it('accepts a retained legacy clock with a separately verified active staking source',async()=>{
  m.legacy='0x0000000000000000000000000000000000000005';
  const original=m.read.getMockImplementation()!;
  m.read.mockImplementation(async(config,args)=>args.functionName==='clockSource'?m.legacy:args.functionName==='activeStakingSource'?'0x0000000000000000000000000000000000000004':original(config,args));
  const {result}=use();
  await waitFor(()=>expect(result.current.data?.expiresAt).toBe(8800n));
});
it('rejects a separated reader pointing rewards to an unapproved active staking source',async()=>{
  m.legacy='0x0000000000000000000000000000000000000005';
  const original=m.read.getMockImplementation()!;
  m.read.mockImplementation(async(config,args)=>args.functionName==='clockSource'?m.legacy:args.functionName==='activeStakingSource'?m.legacy:original(config,args));
  const {result}=use();await waitFor(()=>expect(result.current.error).toMatch(/clock|source/i));expect(result.current.data).toBeUndefined();
});
it('uses the anchored epoch end after a clock change, not genesis plus current duration', async () => {
  const { result } = use();
  await waitFor(() => expect(result.current.data?.expiresAt).toBe(8800n));
  expect(m.read.mock.calls.find(call => call[1].functionName === 'epochBounds')?.[1]).toMatchObject({ blockNumber: 100n, args: [101n] });
  expect(m.code.mock.calls[0][1]).toMatchObject({ blockNumber: 100n });
});
it('rejects a reader code mismatch without falling back to old arithmetic', async () => {
  m.code.mockResolvedValue('0x6001');
  const { result } = use();
  await waitFor(() => expect(result.current.error).toMatch(/clock|reader/i));
  expect(result.current.data).toBeUndefined();
});
it('rejects malformed or expired versioned metadata', async () => {
  const original = m.read.getMockImplementation()!;
  m.read.mockImplementation(async (config, args) => args.functionName === 'epochBounds' ? { epoch: 100n, version: 2n, start: 6000n, end: 7000n, duration: 1800n } : original(config, args));
  const { result } = use();
  await waitFor(() => expect(result.current.error).toMatch(/clock|epoch/i));
  expect(result.current.data).toBeUndefined();
});
