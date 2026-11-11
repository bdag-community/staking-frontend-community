import {renderHook,waitFor} from '@testing-library/react';
import {SWRConfig} from 'swr';
import {beforeEach,it,expect,vi} from 'vitest';
import {useInitialBondingPeriod} from '@/hooks/use-initial-bonding-period';
import {useStakingPeriods} from '@/hooks/use-staking-periods';
const m=vi.hoisted(()=>({read:vi.fn()}));
const legacy='0x0000000000000000000000000000000000000001',fresh='0x0000000000000000000000000000000000000002';
vi.mock('@/config/env',()=>({ENV:{LEGACY_ONLY:false,CHAIN:{ID:'1043',RPC_URL:'https://testnet-staking.bdag.co/rpc',STAKING_V1_ADDRESS:'0x0000000000000000000000000000000000000001',STAKING_V2_ADDRESS:'0x0000000000000000000000000000000000000002',STAKING_CONTRACT_ADDRESS:'0x0000000000000000000000000000000000000002'}}}));
vi.mock('@/config/reown',()=>({wagmiAdapter:{wagmiConfig:{}}}));
vi.mock('@/hooks/use-wallet',()=>({useWallet:()=>({address:'0x0000000000000000000000000000000000000003',isConnected:true})}));
vi.mock('@/utils/contract-calls',()=>({readContractWithRetry:m.read}));
const wrapper=({children})=><SWRConfig value={{provider:()=>new Map(),shouldRetryOnError:false}}>{children}</SWRConfig>;
beforeEach(()=>{m.read.mockReset().mockImplementation(async(_,args)=>({userFirstDepositTimestamp:100n,INITIAL_BONDING_PERIOD:7200n,bondingPeriod:7200n,unbondingPeriod:5400n,epochDuration:1800n,bondingEndsAt:9999n})[args.functionName]);});
it('reads the legacy position’s actual frozen bonding deadline on the same chain',async()=>{
  const {result}=renderHook(()=>(useInitialBondingPeriod as any)({version:'v1'}),{wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));
  expect(result.current.bondingEndsAt).toBe(9999);
  expect(m.read.mock.calls.every(c=>c[1].address===legacy)).toBe(true);
});
it('keeps old and new waiting-policy reads in distinct contract caches',async()=>{
  const {result,rerender}=renderHook(({version})=>(useStakingPeriods as any)({version}),{initialProps:{version:'v1'},wrapper});
  await waitFor(()=>expect(result.current.isLoading).toBe(false));
  expect(m.read.mock.calls.every(c=>c[1].address===legacy)).toBe(true);
  m.read.mockClear();rerender({version:'v2'});
  await waitFor(()=>expect(m.read).toHaveBeenCalled());expect(m.read.mock.calls.every(c=>c[1].address===fresh)).toBe(true);
});
