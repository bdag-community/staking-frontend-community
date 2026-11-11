import {sha256,toBytes} from 'viem';
import {parseMainnetProfile} from './mainnet-profile';
/** Reject incomplete public network settings before producing a browser bundle. */
export function validatePublicConfig(env: Record<string, string | undefined>) {
  for (const name of ["NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS"]) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(env[name] ?? "") || /^0x0{40}$/.test(env[name] ?? "")) throw new Error(`Missing or invalid ${name}`);
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(env.NEXT_PUBLIC_EXPECTED_GENESIS_HASH ?? "")) throw new Error("Missing or invalid NEXT_PUBLIC_EXPECTED_GENESIS_HASH");
  for (const name of ["NEXT_PUBLIC_RPC_URL", "NEXT_PUBLIC_STAKING_API_URL"]) {
    const value = env[name];
    if (!value || !/^https?:$/.test(new URL(value).protocol)) throw new Error(`Missing or invalid ${name}`);
  }
  if (!Number.isSafeInteger(Number(env.NEXT_PUBLIC_METAMASK_CHAIN_ID)) || Number(env.NEXT_PUBLIC_METAMASK_CHAIN_ID) <= 0) throw new Error("Missing or invalid NEXT_PUBLIC_METAMASK_CHAIN_ID");
  if(env.NEXT_PUBLIC_METAMASK_CHAIN_ID==='1404'){
    const p=parseMainnetProfile(env.NEXT_PUBLIC_MAINNET_PROFILE_JSON,env.NEXT_PUBLIC_MAINNET_PROFILE_SHA256,raw=>sha256(toBytes(raw)));
    for(const [key,want]of Object.entries({NEXT_PUBLIC_EXPECTED_GENESIS_HASH:p.genesisHash,NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS:p.stakingProxy,NEXT_PUBLIC_STAKING_V1_ADDRESS:p.legacyStakingProxy,NEXT_PUBLIC_STAKING_V2_ADDRESS:p.stakingProxy,NEXT_PUBLIC_READER_ADDRESS:p.epochClock.reader,NEXT_PUBLIC_EPOCH_READER_CODE_HASH:p.epochClock.codeHash,NEXT_PUBLIC_MINING_CREDENTIAL_ADDRESS:p.contracts.miningCredential,NEXT_PUBLIC_STAKING_CREDENTIAL_ADDRESS:p.contracts.stakingCredential}))if(env[key]?.toLowerCase()!==want.toLowerCase())throw Error('Mainnet profile/environment mismatch: '+key);
    if(env.NEXT_PUBLIC_EPOCH_CLOCK_INTERFACE!=='3'||env.NEXT_PUBLIC_LEGACY_ONLY==='true'||env.NEXT_PUBLIC_LEGACY_REHEARSAL==='true')throw Error('Mainnet legacy/epoch profile mismatch');
  }
  if (env.NEXT_PUBLIC_EPOCH_CLOCK_INTERFACE === "3") {
    const reader=env.NEXT_PUBLIC_READER_ADDRESS??"";
    if (!/^0x[0-9a-f]{40}$/i.test(reader)||/^0x0{40}$/i.test(reader)) throw new Error("Missing or invalid NEXT_PUBLIC_READER_ADDRESS for the versioned clock");
    if (!/^0x[0-9a-f]{64}$/i.test(env.NEXT_PUBLIC_EPOCH_READER_CODE_HASH??"")) throw new Error("Missing or invalid NEXT_PUBLIC_EPOCH_READER_CODE_HASH for the versioned clock");
  }
}
