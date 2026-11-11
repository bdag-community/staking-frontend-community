import React, {useState} from 'react';
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render as renderUi, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import {InfoTooltip} from '@/components/ui/InfoTooltip';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Sidebar, SidebarProvider, SidebarTrigger} from '@/components/ui/sidebar';
import {RecentActivityTable} from '@/components/portfolio/RecentActivityTable';
import {PortfolioStats} from '@/components/portfolio/PortfolioStats';
import type {Transaction} from '@/utils/interface';
import {TooltipProvider} from '@/components/ui/tooltip';
import {CopyButton} from '@/components/ui/copy-button';
import {ExplorerLink} from '@/components/ui/explorer-link';
const render=(ui:React.ReactElement)=>renderUi(<TooltipProvider>{ui}</TooltipProvider>);

const state=vi.hoisted(()=>({duration:1800000,error:null as string|null,loading:false,explorer:''}));
vi.mock('@/config/env',()=>({ENV:{IS_TESTNET:true,LEGACY_ONLY:false,NETWORK_LABEL:'Community Testnet',CHAIN:{ID:'1043',EXPECTED_GENESIS_HASH:'0x123',get BLOCK_EXPLORER_URL(){return state.explorer;}}}}));
vi.mock('@/hooks/use-epoch-status',()=>({useEpochStatus:()=>({epochDuration:state.duration,error:state.error,loading:state.loading})}));
vi.mock('@/hooks/use-pool-addresses',()=>({usePoolAddresses:()=>({pools:[],loading:false,error:null,hasMore:false})}));
vi.mock('@/hooks/use-global-stats',()=>({useGlobalStats:()=>({globalStats:{activePoolsCount:0,totalPoolsCount:0,avgApy:0},isLoading:false,error:null})}));
vi.mock('@/hooks/use-reward-split',()=>({useRewardSplit:()=>({data:{miners:70,stakers:30},error:null})}));
vi.mock('@/hooks/use-staking-periods',()=>({useStakingPeriods:()=>({formatted:{initialBondingPlain:'2 hours',unbondingPlain:'90 minutes',epochPlain:'30 minutes'},isLoading:false,error:null})}));
vi.mock('@/hooks/use-contract-version',()=>({useContractVersion:()=>({minStake:.001,address:'0x123',isLoading:false,error:null})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>true}));
afterEach(()=>{cleanup();state.duration=1800000;state.error=null;state.loading=false;state.explorer='';});

it('describes voting timing using the referenced chain rather than the expired 60-second schedule',()=>{
 render(<MemoryRouter><HomePage/></MemoryRouter>);
 expect(screen.queryByText(/60-second/)).not.toBeInTheDocument();
 expect(screen.getByText(/Voting uses 30-minute epochs/)).toBeInTheDocument();
});
it('does not advertise cached or fabricated voting timing when the clock is unavailable',()=>{
 state.error='Clock unavailable';render(<MemoryRouter><HomePage/></MemoryRouter>);
 expect(screen.getByText(/Voting epoch timing is temporarily unavailable/)).toBeInTheDocument();
 expect(screen.queryByText(/Voting uses .* epochs/)).not.toBeInTheDocument();
});
it('names the help icon for keyboard and screen-reader users',()=>{
 render(<InfoTooltip content="Estimated yield varies."/>);
 expect(screen.getByRole('button',{name:'More information'})).toHaveAttribute('type','button');
});
it('makes identifier copying keyboard-reachable with an accessible name',()=>{
 render(<CopyButton value={'0x'+'a'.repeat(64)}/>);
 expect(screen.getByRole('button',{name:'Copy identifier'})).toHaveAttribute('type','button');
});
function ControlledDialog(){const [open,setOpen]=useState(false);return <><button onClick={()=>setOpen(true)}>Review stake</button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Stake review</DialogTitle><button>Inside dialog</button></DialogContent></Dialog></>;}
it('returns focus to the external invoking button after a controlled dialog closes',async()=>{
 render(<ControlledDialog/>);const opener=screen.getByRole('button',{name:'Review stake'});opener.focus();fireEvent.click(opener);
 fireEvent.keyDown(await screen.findByRole('dialog'),{key:'Escape'});
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 await waitFor(()=>expect(opener).toHaveFocus());
});
it('gives the mobile sidebar a dialog name and restores its trigger focus',async()=>{
 render(<SidebarProvider><SidebarTrigger/><Sidebar>Test navigation</Sidebar></SidebarProvider>);
 const trigger=screen.getByRole('button',{name:'Toggle Sidebar'});trigger.focus();fireEvent.click(trigger);
 const dialog=await screen.findByRole('dialog',{name:'Navigation menu'});
 fireEvent.keyDown(dialog,{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 await waitFor(()=>expect(trigger).toHaveFocus());
});
const transaction=(eventType:string,amount='0.724')=>({id:1,txHash:'0x'+'a'.repeat(64),eventType,amount,timestamp:'2026-10-13T12:00:00Z'} as Transaction);
const history=(eventType:string)=><RecentActivityTable history={[transaction(eventType)]} isLoadingHistory={false} isInitialLoading={false} hasMore={false} onLoadMore={()=>{}}/>;
it('keeps a hash readable and copyable without fabricating an explorer link',()=>{
 render(history('StakeClaimed'));expect(screen.queryByRole('link')).not.toBeInTheDocument();
 expect(screen.getByText('0xaaaa...aaaa')).toBeInTheDocument();
});
it('retains a configured safe explorer link with a correctly joined path',()=>{
 state.explorer='https://explorer.example';render(history('StakeClaimed'));
 expect(screen.getByRole('link')).toHaveAttribute('href','https://explorer.example/tx/'+'0x'+'a'.repeat(64));
});
it('preserves Radix trigger refs for both the readable fallback and configured explorer',()=>{
 const ref=React.createRef<HTMLAnchorElement>();
 const view=render(<ExplorerLink path="address/0x123" ref={ref}>Identifier</ExplorerLink>);
 expect(ref.current).toBe(screen.getByText('Identifier'));expect(ref.current?.tagName).toBe('SPAN');
 state.explorer='https://explorer.example';view.rerender(<ExplorerLink path="address/0x123" ref={ref}>Identifier</ExplorerLink>);
 expect(ref.current?.tagName).toBe('A');
});
it('calls a pooled claim a withdrawal instead of claiming it is principal-only',()=>{
 render(history('StakeClaimed'));expect(screen.getByText('Withdrawal claimed')).toBeInTheDocument();
});
it('labels the indexed Unstaked payout in BDAG; burned shares are a different event field',()=>{
 render(history('Unstaked'));expect(screen.getByText('0.72 BDAG')).toBeInTheDocument();
 expect(screen.queryByText('0.72 shares')).not.toBeInTheDocument();
});
it('does not claim a reliable principal/reward payout split for pooled withdrawals',()=>{
 render(<PortfolioStats totalStaked="75" totalClaimedAmount="25.724" weeklyEarnings="1" totalPendingRewards=".2" awaitingUnbondingAmount="0" totalClaimable="0" isLoadingTotal={false} isLoadingRewards={false} isLoadingUnbonding={false}/>);
 expect(screen.getByText('Total withdrawal payouts')).toBeInTheDocument();
 expect(screen.queryByText('Rewards Claimed')).not.toBeInTheDocument();
 expect(screen.queryByText('Staked Funds Reclaimed')).not.toBeInTheDocument();
 expect(screen.getByText(/may contain principal and rewards/)).toBeInTheDocument();
});
