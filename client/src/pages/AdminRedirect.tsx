import { Button } from "@/components/ui/button";
import { Mail, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export function AdminPage() {
  const [, setLocation] = useLocation();
  return <><header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#ce6959]">Administration</p><h1 className="text-3xl font-semibold tracking-[-.045em] text-[#282422] sm:text-[34px]">La configuration d’envoi a changé d’espace.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#736d68]">Les identités SMTP ne sont plus administrées globalement. Chaque organisation gère ses propres profils vérifiés dans l’espace Expédition.</p></div><Button onClick={() => setLocation("/sending")} className="bg-[#ed7664] text-white hover:bg-[#d96655]"><Mail className="mr-2 h-4 w-4" />Ouvrir Expédition</Button></header><section className="rounded-2xl border border-[#ece6e3] bg-white p-7 shadow-[0_8px_28px_rgba(46,35,31,.035)]"><div className="flex max-w-2xl gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff0ed] text-[#bf594b]"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">Profils SMTP isolés par organisation</h2><p className="mt-2 text-sm leading-6 text-[#756c67]">Ajoutez, vérifiez et activez une identité d’envoi depuis Expédition. Les campagnes, emails de test et auto-répondeurs utilisent alors ce profil actif sans révéler les identifiants enregistrés.</p></div></div></section></>;
}
