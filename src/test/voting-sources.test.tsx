import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';
import { parseVotingSources, useVotingSources } from '@/hooks/use-voting-sources';

const wallet='0x0000000000000000000000000000000000000001';
const genesis='0x'+'ab'.repeat(32);
const mocks=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('@/hooks/use-wallet',()=>({useWallet:()=>({address:'0x0000000000000000000000000000000000000001',isConnected:true})}));
vi.mock('@/hooks/use-api',()=>({default:()=>mocks.request}));
vi.mock('@/config/env',()=>({ENV:{CHAIN:{ID:1043,RPC_URL:'https://test.invalid/rpc',EXPECTED_GENESIS_HASH:'0x'+'ab'.repeat(32)}}}));
const snapshot=(pools:string[]=[])=>({interfaceVersion:'1',complete:true,chainId:1043,genesisHash:genesis,wallet,pools,activeVotingEpoch:10,blockNumber:120,blockHash:'0x'+'cd'.repeat(32)});

describe('complete historical voting source discovery',()=>{
 it('keeps more than one active-position page of pool evidence',()=>{
  const pools=Array.from({length:12},(_,i)=>'0x'+(100+i).toString(16).padStart(40,'0'));
  expect(parseVotingSources(snapshot(pools),wallet,1043,genesis).pools).toEqual(pools);
 });
 it('rejects partial, wrong-wallet and wrong-chain evidence instead of assuming zero',()=>{
  for(const broken of [{...snapshot(),complete:false},{...snapshot(),wallet:'0x0000000000000000000000000000000000000002'},{...snapshot(),chainId:106043},{...snapshot(),genesisHash:'0x'+'cd'.repeat(32)},{...snapshot(),pools:['not-an-address']}]){
   expect(()=>parseVotingSources(broken,wallet,1043,genesis)).toThrow(/unavailable/i);
  }
 });
 it('explicit refresh reloads pool discovery after a new stake is observed',async()=>{
  mocks.request.mockResolvedValueOnce({success:true,data:snapshot(),message:'ok'}).mockResolvedValueOnce({success:true,data:snapshot([wallet]),message:'ok'});
  const {result}=renderHook(()=>useVotingSources(),{wrapper:({children})=><SWRConfig value={{provider:()=>new Map(),dedupingInterval:0}}>{children}</SWRConfig>});
  await waitFor(()=>expect(result.current.data?.pools).toEqual([]));
  await act(async()=>{await result.current.refetch();});
  expect(result.current.data?.pools).toEqual([wallet]);
  expect(mocks.request).toHaveBeenLastCalledWith({endpoint:`/voting-pools/${wallet}`});
 });
 it('requires a canonical hash for the source snapshot',()=>{
  for(const blockHash of [undefined,null,'0x123',42])expect(()=>parseVotingSources({...snapshot(),blockHash},wallet,1043,genesis)).toThrow(/unavailable/i);
  const verified=parseVotingSources(snapshot(),wallet,1043,genesis);
  expect(verified.blockNumber).toBe(120);
  expect(verified.blockHash).toBe(snapshot().blockHash);
 });
});
