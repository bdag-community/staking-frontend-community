import {ENV} from "@/config/env";

export function explorerUrl(path:string,base:string|undefined=ENV.CHAIN.BLOCK_EXPLORER_URL):string|null {
  if(!base?.trim())return null;
  try {
    const url=new URL(base.endsWith("/")?base:base+"/");
    if(!["https:","http:"].includes(url.protocol)||url.username||url.password||url.search||url.hash)return null;
    return new URL(path.replace(/^\/+/,""),url).href;
  }catch{return null;}
}
