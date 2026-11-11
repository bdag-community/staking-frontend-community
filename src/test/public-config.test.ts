import { describe, expect, it } from "vitest";
import { validatePublicConfig } from "@/lib/public-config";
const valid = { NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS: `0x${"1".repeat(40)}`, NEXT_PUBLIC_EXPECTED_GENESIS_HASH: `0x${"2".repeat(64)}`, NEXT_PUBLIC_RPC_URL: "http://127.0.0.1:41745", NEXT_PUBLIC_STAKING_API_URL: "http://127.0.0.1:3101/api/v1", NEXT_PUBLIC_METAMASK_CHAIN_ID: "8008" };
describe("public build configuration", () => {
  it("accepts a pinned network", () => expect(() => validatePublicConfig(valid)).not.toThrow());
  it.each(Object.keys(valid))("rejects a missing %s", key => expect(() => validatePublicConfig({ ...valid, [key]: undefined })).toThrow());
  it("rejects a zero contract address", () => expect(() => validatePublicConfig({ ...valid, NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS: `0x${"0".repeat(40)}` })).toThrow());
  const clock={...valid,NEXT_PUBLIC_EPOCH_CLOCK_INTERFACE:'3',NEXT_PUBLIC_READER_ADDRESS:`0x${'3'.repeat(40)}`,NEXT_PUBLIC_EPOCH_READER_CODE_HASH:`0x${'4'.repeat(64)}`};
  it('accepts a complete pinned versioned clock',()=>expect(()=>validatePublicConfig(clock)).not.toThrow());
  it.each(['NEXT_PUBLIC_READER_ADDRESS','NEXT_PUBLIC_EPOCH_READER_CODE_HASH'])('rejects a versioned clock missing %s',key=>expect(()=>validatePublicConfig({...clock,[key]:undefined})).toThrow());
  it('rejects a zero versioned reader address',()=>expect(()=>validatePublicConfig({...clock,NEXT_PUBLIC_READER_ADDRESS:`0x${'0'.repeat(40)}`})).toThrow());
});
