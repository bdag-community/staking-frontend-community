import {describe,it,expect} from 'vitest';import {sha256,toBytes} from 'viem';import {validatePublicConfig} from '@/lib/public-config';import profile from './fixtures/mainnet-profile.fixture.json';
const base={NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS:profile.stakingProxy,NEXT_PUBLIC_STAKING_V1_ADDRESS:profile.legacyStakingProxy,NEXT_PUBLIC_STAKING_V2_ADDRESS:profile.stakingProxy,NEXT_PUBLIC_EXPECTED_GENESIS_HASH:profile.genesisHash,NEXT_PUBLIC_RPC_URL:'https://rpc.capedag.com/',NEXT_PUBLIC_STAKING_API_URL:'https://api.invalid/api/v1',NEXT_PUBLIC_METAMASK_CHAIN_ID:'1404',NEXT_PUBLIC_EPOCH_CLOCK_INTERFACE:'3',NEXT_PUBLIC_READER_ADDRESS:profile.epochClock.reader,NEXT_PUBLIC_EPOCH_READER_CODE_HASH:profile.epochClock.codeHash,NEXT_PUBLIC_MINING_CREDENTIAL_ADDRESS:profile.contracts.miningCredential,NEXT_PUBLIC_STAKING_CREDENTIAL_ADDRESS:profile.contracts.stakingCredential};
const env=(p=profile)=>{const raw=JSON.stringify(p);return {...base,NEXT_PUBLIC_MAINNET_PROFILE_JSON:raw,NEXT_PUBLIC_MAINNET_PROFILE_SHA256:sha256(toBytes(raw)).slice(2)};};
describe('sealed Mainnet Staking profile',()=>{
 it('rejects a bare chain-1404 configuration without an approved runtime/identity profile',()=>expect(()=>validatePublicConfig(base)).toThrow());
 it('accepts one complete sealed same-network Legacy/V2 profile',()=>expect(()=>validatePublicConfig(env())).not.toThrow());
 it('rejects review-only, wrong-history, shortened-epoch, mixed-source and changed-digest profiles',()=>{
  for(const p of [{...profile,status:'review',installationAuthorized:false},{...profile,epochSeconds:1800},{...profile,baseline:{...profile.baseline,hash:'0x'+'12'.repeat(32)}}])expect(()=>validatePublicConfig(env(p))).toThrow();
  for(const override of [{NEXT_PUBLIC_MAINNET_PROFILE_SHA256:'ab'.repeat(32)},{NEXT_PUBLIC_STAKING_V1_ADDRESS:profile.stakingProxy},{NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS:profile.legacyStakingProxy}])expect(()=>validatePublicConfig({...env(),...override})).toThrow();
 });
});
