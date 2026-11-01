import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Copy, Image, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AcceptedType = (typeof acceptedTypes)[number];

export function MediaLibraryPage() {
  const assets = trpc.marketing.assets.list.useQuery();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState("");
  const upload = trpc.marketing.assets.uploadImage.useMutation({
    onSuccess: () => { toast.success("Image ajoutée à votre bibliothèque."); setAltText(""); utils.marketing.assets.list.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.marketing.assets.delete.useMutation({ onSuccess: () => { toast.success("Référence d’image supprimée."); utils.marketing.assets.list.invalidate(); }, onError: error => toast.error(error.message) });
  const uploadFile = (file?: File) => {
    if (!file) return;
    if (!acceptedTypes.includes(file.type as AcceptedType)) { toast.error("Choisissez une image JPG, PNG, WebP ou GIF."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Une image ne peut pas dépasser 5 Mo."); return; }
    const reader = new FileReader();
    reader.onload = () => upload.mutate({ fileName: file.name, contentType: file.type as AcceptedType, dataUrl: String(reader.result), altText: altText || undefined });
    reader.onerror = () => toast.error("La lecture du fichier a échoué.");
    reader.readAsDataURL(file);
  };
  const copyUrl = async (url: string) => { try { await navigator.clipboard.writeText(url); toast.success("URL copiée. Vous pouvez la coller dans un bloc Image."); } catch { toast.error("Impossible de copier l’URL automatiquement."); } };
  return <><header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#ce6959]">Médias</p><h1 className="text-3xl font-semibold tracking-[-.045em] text-[#282422] sm:text-[34px]">Vos images, prêtes à envoyer.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#736d68]">Téléversez les visuels de votre organisation une seule fois, puis insérez leur URL dans vos blocs Image de campagne ou de modèle.</p></div></header>
    <section className="rounded-2xl border border-[#ece6e3] bg-white p-6 shadow-[0_8px_28px_rgba(46,35,31,.035)]"><div className="grid gap-5 lg:grid-cols-[1fr_auto]"><div><Label htmlFor="media-alt">Texte alternatif par défaut</Label><Input id="media-alt" value={altText} onChange={event => setAltText(event.target.value)} maxLength={255} className="mt-1.5" placeholder="Ex. aperçu de la nouvelle collection" /><p className="mt-1.5 text-xs leading-5 text-[#8a817c]">JPG, PNG, WebP ou GIF · 5 Mo maximum. Les fichiers sont isolés dans l’espace de votre organisation.</p></div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => { uploadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button onClick={() => fileRef.current?.click()} disabled={upload.isPending} className="self-end bg-[#ed7664] text-white hover:bg-[#d96655]">{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Téléverser une image</Button></div></section>
    <section className="mt-7"><div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-semibold">Bibliothèque de l’organisation</h2><p className="mt-1 text-xs text-[#887f7a]">Copiez l’URL d’un visuel pour l’utiliser immédiatement dans une campagne.</p></div><span className="text-xs text-[#9a908b]">{assets.data?.length ?? 0} image(s)</span></div>{assets.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#d66555]" /></div> : assets.data?.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{assets.data.map(asset => <article key={asset.id} className="overflow-hidden rounded-2xl border border-[#ece6e3] bg-white shadow-[0_8px_28px_rgba(46,35,31,.035)]"><img src={asset.url} alt={asset.altText || asset.fileName} className="h-44 w-full bg-[#f6f2ef] object-cover" /><div className="p-4"><h2 className="truncate text-sm font-semibold">{asset.fileName}</h2><p className="mt-1 truncate text-xs text-[#877e79]">{asset.altText || "Sans texte alternatif"}</p><p className="mt-2 text-[11px] text-[#9a908b]">{Math.round(asset.sizeBytes / 1024)} Ko · {asset.contentType.replace("image/", "").toUpperCase()}</p><div className="mt-4 flex gap-2"><Button onClick={() => copyUrl(asset.url)} size="sm" variant="outline" className="flex-1 border-[#e5ddd9]"><Copy className="mr-1.5 h-3.5 w-3.5" />Copier l’URL</Button><Button onClick={() => remove.mutate({ id: asset.id })} disabled={remove.isPending} size="icon" variant="outline" className="h-8 w-8 border-[#f0d8d3] text-[#b65244] hover:bg-[#fff1ed]"><Trash2 className="h-3.5 w-3.5" /></Button></div></div></article>)}</div> : <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-[#e6ddd9] bg-white px-6 text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#fff0ed] text-[#bf594b]"><Image className="h-4 w-4" /></span><h2 className="mt-4 font-semibold">Votre bibliothèque d’images est vide.</h2><p className="mt-2 text-sm text-[#837a75]">Ajoutez votre premier visuel pour le réutiliser dans vos emails.</p></div></div>}</section></>;
}
