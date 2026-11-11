import {useRef} from "react";

/** Controlled dialogs need not have a Radix Trigger. Preserve their real opener. */
export function useDialogFocusReturn() {
  const opener=useRef<HTMLElement|null>(null);
  return {
    onOpenAutoFocus(event:Event,callback?: (event:Event)=>void) {
      opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
      callback?.(event);
    },
    onCloseAutoFocus(event:Event,callback?: (event:Event)=>void) {
      callback?.(event);
      if(!event.defaultPrevented&&opener.current?.isConnected) {
        event.preventDefault();opener.current.focus();
      }
    },
  };
}
