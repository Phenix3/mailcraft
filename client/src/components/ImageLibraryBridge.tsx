import { trpc } from "@/lib/trpc";
import { Image, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Anchor = { input: HTMLInputElement; top: number; left: number; width: number };

export function ImageLibraryBridge() {
  const assets = trpc.marketing.assets.list.useQuery();
  const [, setLocation] = useLocation();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  useEffect(() => {
    const openForImageInput = (event: FocusEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.disabled || !input.placeholder.includes("URL de l’image")) return;
      const rect = input.getBoundingClientRect();
      setAnchor({ input, top: Math.min(window.innerHeight - 210, rect.bottom + 6), left: Math.min(window.innerWidth - 340, rect.left), width: Math.min(340, rect.width) });
    };
    const close = () => window.setTimeout(() => { if (!document.querySelector("[data-image-library-popover]:hover")) setAnchor(null); }, 180);
    document.addEventListener("focusin", openForImageInput);
    document.addEventListener("focusout", close);
    return () => { document.removeEventListener("focusin", openForImageInput); document.removeEventListener("focusout", close); };
  }, []);
  const choose = (url: string) => {
    if (!anchor) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(anchor.input, url);
    anchor.input.dispatchEvent(new Event("input", { bubbles: true }));
    anchor.input.dispatchEvent(new Event("change", { bubbles: true }));
    anchor.input.focus();
    setAnchor(null);
  };
  if (!anchor) return null;
  return <div data-image-library-popover className="fixed z-50 overflow-hidden rounded-xl border border-[#eadfd9] bg-white p-2 shadow-[0_16px_38px_rgba(46,35,31,.16)]" style={{ top: anchor.top, left: anchor.left, width: anchor.width }} onMouseDown={event => event.preventDefault()}><div className="mb-1 flex items-center gap-2 px-2 py-1.5"><Image className="h-3.5 w-3.5 text-[#c75e50]" /><span className="text-xs font-semibold text-[#5b514c]">Bibliothèque d’images</span></div>{assets.isLoading ? <div className="grid h-16 place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[#cf6656]" /></div> : assets.data?.length ? <div className="max-h-40 space-y-1 overflow-y-auto">{assets.data.map(asset => <button key={asset.id} type="button" onClick={() => choose(asset.url)} className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-[#fff4f1]"><img src={asset.url} alt="" className="h-8 w-8 rounded-md bg-[#f5f1ef] object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-[#665d58]">{asset.fileName}</span></button>)}</div> : <button type="button" onClick={() => { setAnchor(null); setLocation("/media"); }} className="w-full rounded-lg px-2 py-2 text-left text-xs text-[#b55345] hover:bg-[#fff4f1]">Téléverser une image dans Médias</button>}<button type="button" onClick={() => { setAnchor(null); setLocation("/media"); }} className="mt-1 w-full border-t border-[#f0e8e4] px-2 pt-2 text-left text-[11px] text-[#8f837d] hover:text-[#b55345]">Gérer les images</button></div>;
}
