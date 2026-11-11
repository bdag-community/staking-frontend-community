import { describe, expect, it } from 'vitest';
import * as staking from '@/lib/staking-contract';
describe('original Mainnet Legacy versus separate V2 interface', () => {
  it('selects original constant getters and skips the absent frozen-deadline getter for Mainnet Legacy', () => {
    const select = (staking as unknown as { stakingTimingSelectors?: (input: unknown) => unknown }).stakingTimingSelectors;
    expect(select, 'missing original-Legacy interface selector').toBeTypeOf('function');
    expect(select!({chainId:1404,version:'v1',legacyOnly:false})).toEqual({bonding:'INITIAL_BONDING_PERIOD',unbonding:'UNBONDING_PERIOD',epoch:'EPOCH_DURATION',frozenBondingEnd:false});
  });
  it('retains dynamic policy and saved deadlines for V2 and historical Testnet V1', () => {
    const select = (staking as unknown as { stakingTimingSelectors?: (input: unknown) => unknown }).stakingTimingSelectors;
    expect(select).toBeTypeOf('function');
    for(const input of [{chainId:1404,version:'v2',legacyOnly:false},{chainId:1404,version:'current',legacyOnly:false},{chainId:1043,version:'v1',legacyOnly:false}]) {
      expect(select!(input)).toEqual({bonding:'bondingPeriod',unbonding:'unbondingPeriod',epoch:'epochDuration',frozenBondingEnd:true});
    }
    expect(select!({chainId:106043,version:'current',legacyOnly:true})).toEqual({bonding:'INITIAL_BONDING_PERIOD',unbonding:'UNBONDING_PERIOD',epoch:'EPOCH_DURATION',frozenBondingEnd:false});
  });
});
