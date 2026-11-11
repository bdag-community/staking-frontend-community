// Kept byte-identical in the three application repositories; no network or secrets.
type Hex = `0x${string}`;
export type MainnetProfile = {
  schema: string; status: string; installationAuthorized: boolean; chainId: number;
  genesisHash: Hex; genesisStateRoot: Hex; nativeMigrationBundleSha256: string;
  baseline: {number:number;hash:Hex;stateRoot:Hex}; epochSeconds:number;
  stakingProxy:Hex;legacyStakingProxy:Hex;contracts:Record<string,Hex>;
  runtimePins:Record<string,{address:Hex;codeHash:Hex}>;
  epochClock:{interfaceVersion:'3';reader:Hex;codeHash:Hex;stakingSource:Hex;activeStakingSource:Hex};fundingEnabled:boolean;
};
const genesis='0x3fb19ea409ac7399ad7b988b88e0d436722c967137e51e834ccefd7611a592ef';
const genesisRoot='0x564aeb23c21b395f94839991240f0665fdf6b083cad3a41ac6412fa2180ac76a';
const baselineHash='0x43ee06b99e53f7245b134ff125edb91e636674fd421bc5796e3eac0f3dc3eb23';
const legacy='0x08bd519f611556dc148e7bffe8d6f078f23a8ef7',fresh='0x1000000000000000000000000000000000000020',reader='0x1000000000000000000000000000000000000002';
const lower=(x:unknown)=>typeof x==='string'?x.toLowerCase():'';
const hash=(x:unknown)=>/^0x[0-9a-f]{64}$/i.test(String(x));
const address=(x:unknown)=>/^0x[0-9a-f]{40}$/i.test(String(x))&&!/^0x0{40}$/i.test(String(x));
export function validateMainnetProfile(value:unknown):MainnetProfile {
  if(!value||typeof value!=='object')throw Error('Mainnet profile unavailable');
  const p=value as MainnetProfile;
  if(p.schema!=='bdag.mainnet.platform-profile.v1'||p.status!=='sealed'||p.installationAuthorized!==true||p.chainId!==1404||p.epochSeconds!==604800||p.fundingEnabled!==false)throw Error('Mainnet profile is unsealed or has incompatible policy');
  if(lower(p.genesisHash)!==genesis||lower(p.genesisStateRoot)!==genesisRoot||p.baseline?.number!==26827713||lower(p.baseline.hash)!==baselineHash||!hash(p.baseline.stateRoot)||!/^[0-9a-f]{64}$/i.test(p.nativeMigrationBundleSha256))throw Error('Mainnet canonical identity mismatch');
  if(lower(p.legacyStakingProxy)!==legacy||lower(p.stakingProxy)!==fresh||p.epochClock?.interfaceVersion!=='3'||lower(p.epochClock.reader)!==reader||lower(p.epochClock.stakingSource)!==legacy||lower(p.epochClock.activeStakingSource)!==fresh||!hash(p.epochClock.codeHash))throw Error('Mainnet staking/clock source mismatch');
  if(!p.contracts||!p.runtimePins)throw Error('Mainnet contract/runtime bindings unavailable');
  for(const [field,role]of Object.entries({governor:'governor',miningCredential:'miningCredential',stakingCredential:'stakingCredential',policyModule:'policy',chainTallyReader:'reader',approvedDevRegistry:'developers',bidBondVault:'bondVault',escrowFactory:'factory',communityTreasury:'treasury'})) {
    if(!address(p.contracts[field])||lower(p.contracts[field])!==lower(p.runtimePins[role]?.address))throw Error('Mainnet contract binding mismatch: '+field);
  }
  if(lower(p.contracts.blocklist)!=='0xe628505d5cb6f5f4f9a25cd5c80caa198cc645a0'||lower(p.contracts.selectiveBlocklist)!=='0xc0a42a43a05e39c3a4165ca98440d516959f41d9')throw Error('Mainnet restriction binding mismatch');
  for(const role of ['reader','legacyImplementation','stakingV2Implementation','stakingV2','miningCredential','stakingCredential','governor','miningTimelock','stakingTimelock','timing','policy','hub','developers','bondVault','treasury','factory','escrow','miningRegistry','legacyEscrow','legacyProxy']) {
    const r=p.runtimePins[role];if(!r||!address(r.address)||!hash(r.codeHash))throw Error('Mainnet runtime pin missing: '+role);
  }
  if(lower(p.runtimePins.reader.codeHash)!==lower(p.epochClock.codeHash)||lower(p.runtimePins.stakingV2.address)!==fresh||lower(p.runtimePins.legacyProxy.address)!==legacy)throw Error('Mainnet runtime/source mismatch');
  return p;
}
export function parseMainnetProfile(raw:string|undefined,digest:string|undefined,sha256:(text:string)=>string):MainnetProfile {
  if(!raw||!digest||!/^[0-9a-f]{64}$/i.test(digest)||sha256(raw).replace(/^0x/,'').toLowerCase()!==digest.toLowerCase())throw Error('Mainnet profile digest mismatch');
  return validateMainnetProfile(JSON.parse(raw));
}
export async function verifyMainnetCanonicalHistory(p:MainnetProfile,request:(method:string,params:unknown[])=>Promise<unknown>):Promise<void> {
  validateMainnetProfile(p);
  const [chain,g,b]=await Promise.all([request('eth_chainId',[]),request('eth_getBlockByNumber',['0x0',false]),request('eth_getBlockByNumber',['0x'+p.baseline.number.toString(16),false])]);
  const gb=g as {hash?:string;stateRoot?:string}|null,bb=b as {hash?:string;stateRoot?:string}|null;
  if(chain!=='0x57c'||lower(gb?.hash)!==lower(p.genesisHash)||lower(gb?.stateRoot)!==lower(p.genesisStateRoot)||lower(bb?.hash)!==lower(p.baseline.hash)||lower(bb?.stateRoot)!==lower(p.baseline.stateRoot))throw Error('Mainnet provider canonical history mismatch');
}
export async function verifyMainnetReadContext(p:MainnetProfile,request:(method:string,params:unknown[])=>Promise<unknown>,hashCode:(code:string)=>string):Promise<void> {
  validateMainnetProfile(p);
  const roles=['reader','governor','miningCredential','stakingCredential','legacyImplementation','stakingV2Implementation','stakingV2','legacyProxy'];
  const impl='0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const [chain,g,b,...rest]=await Promise.all([request('eth_chainId',[]),request('eth_getBlockByNumber',['0x0',false]),request('eth_getBlockByNumber',['0x'+p.baseline.number.toString(16),false]),
    ...roles.map(role=>request('eth_getCode',[p.runtimePins[role].address,'latest'])),request('eth_getStorageAt',[p.legacyStakingProxy,impl,'latest']),request('eth_getStorageAt',[p.stakingProxy,impl,'latest'])]);
  const gb=g as {hash?:string;stateRoot?:string}|null,bb=b as {hash?:string;stateRoot?:string}|null;
  if(chain!=='0x57c'||lower(gb?.hash)!==lower(p.genesisHash)||lower(gb?.stateRoot)!==lower(p.genesisStateRoot)||lower(bb?.hash)!==lower(p.baseline.hash)||lower(bb?.stateRoot)!==lower(p.baseline.stateRoot))throw Error('Mainnet provider canonical history mismatch');
  roles.forEach((role,i)=>{if(typeof rest[i]!=='string'||lower(hashCode(rest[i] as string))!==lower(p.runtimePins[role].codeHash))throw Error('Mainnet runtime unavailable or changed: '+role);});
  for(const [index,role]of [[roles.length,'legacyImplementation'],[roles.length+1,'stakingV2Implementation']] as const)if(lower(rest[index])!=='0x'+p.runtimePins[role].address.slice(2).toLowerCase().padStart(64,'0'))throw Error('Mainnet proxy implementation mismatch');
}
