import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCredentialContract } from '@/hooks/use-credential-contract';

const mocks = vi.hoisted(() => ({ read: vi.fn(), block: vi.fn().mockResolvedValue(43874n), header: vi.fn() }));
beforeEach(()=>{mocks.read.mockClear();mocks.block.mockClear();mocks.header.mockReset().mockResolvedValue({number:43874n,hash:'0x'+'ab'.repeat(32)});});
it('does not issue an incomplete first staking preview while source discovery is still pending',async()=>{
 mocks.block.mockClear();mocks.read.mockClear();
 const {result}=renderHook(()=>useCredentialContract({enabled:false}),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
 await waitFor(()=>expect(result.current.isLoading).toBe(false));
 expect(mocks.block).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled();expect(result.current.data).toBeUndefined();
});
it('recovers a visible errored preview after transient retries are exhausted, without a reload',async()=>{
 vi.useFakeTimers();
 mocks.block.mockRejectedValueOnce(new Error('Temporary voting read timeout')).mockResolvedValue(43874n);
 mocks.read.mockImplementation(async(_config,args)=>({poolsOf:[],poolTotalShares:0n,currentEpoch:2n,votingReady:true,rawWeightOf:100n,balanceOf:0n,delegateAt:'0x0000000000000000000000000000000000000001',isDelegate:false,totalSupplyAt:1000n,epochDuration:60n,genesisTime:0n})[args.functionName]);
 const view=renderHook(()=>useCredentialContract(),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0,onErrorRetry:()=>{},revalidateOnFocus:false}}>{children}</SWRConfig>});
 try{
  await act(()=>vi.advanceTimersByTimeAsync(100));expect(view.result.current.error).toBeTruthy();
  await act(()=>vi.advanceTimersByTimeAsync(12000));
  expect(view.result.current.data?.available).toBe(100n);expect(view.result.current.error).toBeNull();
 }finally{view.unmount();vi.useRealTimers();mocks.block.mockResolvedValue(43874n);}
});
vi.mock('@/hooks/use-wallet', () => ({ useWallet: () => ({ address: '0x0000000000000000000000000000000000000001', isConnected: true }) }));
vi.mock('@/hooks/use-wallet-network-validation', () => ({ useWalletNetworkValidation: () => ({}) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/config/env', () => ({ ENV: { CHAIN: { STAKING_CREDENTIAL_ADDRESS: '0x0000000000000000000000000000000000000002', STAKING_CONTRACT_ADDRESS:'0x0000000000000000000000000000000000000004' } } }));
vi.mock('@/config/reown', () => ({ blockdagTestnet: { id: 8008 }, wagmiAdapter: { wagmiConfig: {} } }));
vi.mock('@/utils/contract-calls', () => ({ readContractWithRetry: mocks.read }));
vi.mock('@wagmi/core', () => ({ getBlockNumber: mocks.block, getBlock: mocks.header, readContract: vi.fn(), simulateContract: vi.fn(), switchChain: vi.fn(), waitForTransactionReceipt: vi.fn(), writeContract: vi.fn() }));

it('previews discovered pools at one block using the exact credential epoch and minted balance overload', async () => {
  const pool = '0x0000000000000000000000000000000000000003' as const;
  mocks.read.mockImplementation(async (_config, args) => {
    if (args.functionName === 'poolsOf') return [];
    if (args.functionName === 'poolTotalShares') return 0n;
    if (args.functionName === 'currentEpoch') return 506652n;
    if (args.functionName === 'votingReady') return true;
    if (args.functionName === 'rawWeightOf') return 100n;
    if (args.functionName === 'balanceOf') return 20n;
    if (args.functionName === 'delegateAt') return '0x0000000000000000000000000000000000000001';
    if (args.functionName === 'isDelegate') return false;
    if (args.functionName === 'totalSupplyAt') return 1000n;
    if (args.functionName === 'epochDuration') return 604800n;
    if (args.functionName === 'genesisTime') return 1000n;
    throw Error('Unexpected read');
  });
  const { result } = renderHook(() => useCredentialContract({ walletPools: [pool] }), {
    wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>,
  });
  await waitFor(() => expect(result.current.data?.available).toBe(80n));
  expect(result.current.data?.sourceEpoch).toBe(506651n);
  expect(result.current.data?.expiresAfterEpoch).toBe(506653n);
  expect(result.current.data?.receipt.status).toBe('claimed');
  expect(result.current.data?.total).toBe(1000n);
  expect(result.current.data?.claimPools).toEqual([pool]);
  const calls = mocks.read.mock.calls.map(call => call[1]);
  expect(calls.slice(0,-1).every(call => call.blockNumber === 43874n)).toBe(true);
  expect(calls.at(-1)).toMatchObject({functionName:'currentEpoch'});
  expect(calls.at(-1).blockNumber).toBeUndefined();
  expect(calls.find(call => call.functionName === 'rawWeightOf').args).toEqual(['0x0000000000000000000000000000000000000001', 506652n, [pool]]);
  expect(calls.find(call => call.functionName === 'balanceOf').args).toEqual(['0x0000000000000000000000000000000000000001', 506652n]);
});

it('includes a native operator pool without requiring receipt registration', async () => {
  const account='0x0000000000000000000000000000000000000001';
  mocks.read.mockImplementation(async (_config,args)=>({poolsOf:[],poolTotalShares:50n,currentEpoch:506652n,votingReady:true,rawWeightOf:100n,balanceOf:0n,delegateAt:account,isDelegate:false,totalSupplyAt:1000n,epochDuration:604800n,genesisTime:1000n})[args.functionName]);
  const {result}=renderHook(()=>useCredentialContract(),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
  await waitFor(()=>expect(result.current.data?.claimPools).toEqual([account]));
  expect(result.current.data?.available).toBe(100n);
});

it('uses the canonical epoch rather than rejecting valid power when browser time is ahead', async () => {
  mocks.read.mockImplementation(async (_config, args) => {
    const fields = { poolsOf: [], currentEpoch: 1n, votingReady: true, rawWeightOf: 100n, balanceOf: 0n,
      delegateAt: '0x0000000000000000000000000000000000000001', isDelegate: false,
      totalSupplyAt: 1000n, epochDuration: 60n, genesisTime: 0n };
    return fields[args.functionName];
  });
  const { result } = renderHook(() => useCredentialContract(), {
    wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>,
  });
  await waitFor(() => expect(mocks.read.mock.calls.some(call => call[1].functionName === 'genesisTime')).toBe(true));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.data?.epoch).toBe(1n);
  expect(result.current.data?.weight).toBe(100n);
  expect(result.current.error).toBeNull();
});

it('does not present source discovery from a prior epoch as complete current voting power',async()=>{
 mocks.read.mockImplementation(async(_config,args)=>({poolsOf:[],poolTotalShares:0n,currentEpoch:2n,votingReady:true,rawWeightOf:100n,balanceOf:0n,delegateAt:'0x0000000000000000000000000000000000000001',isDelegate:false,totalSupplyAt:1000n,epochDuration:60n,genesisTime:0n})[args.functionName]);
 const {result}=renderHook(()=>useCredentialContract({sourceEpoch:1}),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
 await waitFor(()=>expect(result.current.error).toMatch(/sources|period/i));
 expect(result.current.data).toBeUndefined();
});

it('discards a snapshot if canonical epoch changes while its weight is being read',async()=>{
 mocks.read.mockImplementation(async(_config,args)=>({poolsOf:[],poolTotalShares:0n,currentEpoch:args.blockNumber?2n:3n,votingReady:true,rawWeightOf:100n,balanceOf:0n,delegateAt:'0x0000000000000000000000000000000000000001',isDelegate:false,totalSupplyAt:1000n,epochDuration:60n,genesisTime:0n})[args.functionName]);
 const {result}=renderHook(()=>useCredentialContract(),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
 await waitFor(()=>expect(result.current.error).toMatch(/period changed/i));
 expect(result.current.data).toBeUndefined();
});

it('rejects a same-epoch reorganization during pinned credential reads',async()=>{
 mocks.read.mockImplementation(async(_config,args)=>({poolsOf:[],poolTotalShares:0n,currentEpoch:2n,votingReady:true,rawWeightOf:100n,balanceOf:0n,delegateAt:'0x0000000000000000000000000000000000000001',isDelegate:false,totalSupplyAt:1000n,epochDuration:60n,genesisTime:0n})[args.functionName]);
 mocks.header.mockResolvedValueOnce({number:43874n,hash:'0x'+'ab'.repeat(32)}).mockResolvedValue({number:43874n,hash:'0x'+'cd'.repeat(32)});
 const {result}=renderHook(()=>useCredentialContract(),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
 await waitFor(()=>expect(result.current.error).toMatch(/snapshot changed|reorg/i));
 expect(result.current.data).toBeUndefined();
});

it('rejects orphaned discovery evidence even if its epoch still matches',async()=>{
 mocks.read.mockImplementation(async(_config,args)=>({poolsOf:[],poolTotalShares:0n,currentEpoch:2n,votingReady:true,rawWeightOf:100n,balanceOf:0n,delegateAt:'0x0000000000000000000000000000000000000001',isDelegate:false,totalSupplyAt:1000n,epochDuration:60n,genesisTime:0n})[args.functionName]);
 const {result}=renderHook(()=>useCredentialContract({sourceEpoch:2,sourceBlock:{number:43874,hash:'0x'+'cd'.repeat(32)}}),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
 await waitFor(()=>expect(result.current.error).toMatch(/source.*canonical|source.*changed/i));
 expect(result.current.data).toBeUndefined();
});

it('finishes an in-flight preview when discovery advances to a newer canonical block in the same epoch', async () => {
  const hash = '0x' + 'ab'.repeat(32);
  const pending: Array<(weight: bigint) => void> = [];
  mocks.header.mockImplementation(async (_config, args) => ({ number: args.blockNumber, hash }));
  mocks.read.mockImplementation(async (_config, args) => {
    if (args.functionName === 'rawWeightOf') return new Promise<bigint>(resolve => pending.push(resolve));
    return { poolsOf: [], poolTotalShares: 0n, currentEpoch: 2n, votingReady: true, balanceOf: 0n,
      delegateAt: '0x0000000000000000000000000000000000000001', isDelegate: false,
      totalSupplyAt: 1000n, epochDuration: 60n, genesisTime: 0n }[args.functionName];
  });
  const view = renderHook(({ number }) => useCredentialContract({ sourceEpoch: 2, sourceBlock: { number, hash } }), {
    initialProps: { number: 43870 },
    wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>,
  });
  await waitFor(() => expect(pending.length).toBe(1));
  view.rerender({ number: 43871 });
  await act(async () => { pending[0](100n); });
  await waitFor(() => expect(view.result.current.data?.available).toBe(100n));
  expect(view.result.current.isLoading).toBe(false);
  expect(view.result.current.data?.epoch).toBe(2n);
  expect(view.result.current.error).toBeNull();
  view.unmount();
});

it('does not blank a fresh verified preview for each same-epoch source-head update', async () => {
  const hash = '0x' + 'ab'.repeat(32);
  mocks.header.mockImplementation(async (_config, args) => ({ number: args.blockNumber, hash }));
  mocks.read.mockImplementation(async (_config, args) => ({ poolsOf: [], poolTotalShares: 0n, currentEpoch: 2n,
    votingReady: true, rawWeightOf: 100n, balanceOf: 0n, delegateAt: '0x0000000000000000000000000000000000000001',
    isDelegate: false, totalSupplyAt: 1000n, epochDuration: 60n, genesisTime: 0n })[args.functionName]);
  const view = renderHook(({ number }) => useCredentialContract({ sourceEpoch: 2, sourceBlock: { number, hash } }), {
    initialProps: { number: 43870 },
    wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>,
  });
  await waitFor(() => expect(view.result.current.data?.available).toBe(100n));
  view.rerender({ number: 43871 });
  expect(view.result.current.data?.available).toBe(100n);
  view.unmount();
});

it('validates the newest discovery block on same-epoch revalidation rather than ignoring source updates', async () => {
  const hash = '0x' + 'ab'.repeat(32);
  mocks.header.mockImplementation(async (_config, args) => ({ number: args.blockNumber, hash }));
  mocks.read.mockImplementation(async (_config, args) => ({ poolsOf: [], poolTotalShares: 0n, currentEpoch: 2n,
    votingReady: true, rawWeightOf: 100n, balanceOf: 0n, delegateAt: '0x0000000000000000000000000000000000000001',
    isDelegate: false, totalSupplyAt: 1000n, epochDuration: 60n, genesisTime: 0n })[args.functionName]);
  const view = renderHook(({ number, sourceHash }) => useCredentialContract({ sourceEpoch: 2, sourceBlock: { number, hash: sourceHash } }), {
    initialProps: { number: 43870, sourceHash: hash },
    wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>,
  });
  await waitFor(() => expect(view.result.current.data?.available).toBe(100n));
  view.rerender({ number: 43871, sourceHash: '0x' + 'cd'.repeat(32) });
  await act(async () => { await view.result.current.refetch(); });
  expect(view.result.current.data).toBeUndefined();
  expect(view.result.current.error).toMatch(/source.*canonical|source.*changed/i);
  expect(mocks.header.mock.calls.some(call => call[1].blockNumber === 43871n)).toBe(true);
  view.unmount();
});

it('clears prior voting data immediately when the source epoch or pool set changes', async () => {
  const hash = '0x' + 'ab'.repeat(32);
  let epoch = 2n;
  mocks.header.mockImplementation(async (_config, args) => ({ number: args.blockNumber, hash }));
  mocks.read.mockImplementation(async (_config, args) => ({ poolsOf: [], poolTotalShares: 0n, currentEpoch: epoch,
    votingReady: true, rawWeightOf: 100n, balanceOf: 0n, delegateAt: '0x0000000000000000000000000000000000000001',
    isDelegate: false, totalSupplyAt: 1000n, epochDuration: 60n, genesisTime: 0n })[args.functionName]);
  const view = renderHook(({ sourceEpoch, walletPools }) => useCredentialContract({ sourceEpoch, walletPools, sourceBlock: { number: 43870, hash } }), {
    initialProps: { sourceEpoch: 2, walletPools: [] as `0x${string}`[] },
    wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>,
  });
  await waitFor(() => expect(view.result.current.data?.epoch).toBe(2n));
  epoch = 3n;
  view.rerender({ sourceEpoch: 3, walletPools: [] });
  expect(view.result.current.data).toBeUndefined();
  await waitFor(() => expect(view.result.current.data?.epoch).toBe(3n));
  view.rerender({ sourceEpoch: 3, walletPools: ['0x0000000000000000000000000000000000000003'] });
  expect(view.result.current.data).toBeUndefined();
  await waitFor(() => expect(view.result.current.data?.claimPools).toEqual(['0x0000000000000000000000000000000000000003']));
  view.unmount();
});
