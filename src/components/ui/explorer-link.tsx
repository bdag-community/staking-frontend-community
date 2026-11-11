import {forwardRef, type ComponentPropsWithoutRef} from "react";
import {explorerUrl} from "@/lib/explorer-url";
export const ExplorerLink=forwardRef<HTMLAnchorElement,Omit<ComponentPropsWithoutRef<"a">,"href">&{path:string}>(function ExplorerLink({path,children,...props},ref) {
  const href=explorerUrl(path);
  return href?<a {...props} ref={ref} href={href}>{children}</a>:<span {...props} ref={ref} title={props.title??"No explorer is configured for this network."}>{children}</span>;
});
