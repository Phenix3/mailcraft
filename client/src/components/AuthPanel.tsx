import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

type AuthPanelProps = {
  onSuccess?: () => void;
};

/**
 * Local email + password sign-in/sign-up panel (self-hosted auth).
 */
export function AuthPanel({ onSuccess }: AuthPanelProps) {
  const [location] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });

  const afterAuth = async () => {
    await utils.auth.me.invalidate();
    onSuccess?.();
    if (location === "/login") window.location.href = "/";
  };

  const login = trpc.auth.login.useMutation({
    onSuccess: afterAuth,
    onError: error =>
      setFormError(
        error instanceof TRPCClientError
          ? error.message
          : "Connexion impossible."
      ),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: afterAuth,
    onError: error =>
      setFormError(
        error instanceof TRPCClientError
          ? error.message
          : "Inscription impossible."
      ),
  });

  const pending = login.isPending || register.isPending || meQuery.isLoading;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (mode === "login") {
      login.mutate({ email, password });
    } else {
      register.mutate({ name, email, password });
    }
  };

  return (
    <section className="w-full max-w-md rounded-[28px] border border-[#e9e3e0] bg-white p-9 text-center shadow-[0_20px_60px_rgba(48,35,32,0.08)]">
      <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#ed7664] text-white">
        <Mail className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold tracking-[0.12em] text-[#d36353] uppercase">
        MailCraft
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#282422]">
        {mode === "login" ? "Connexion" : "Créer votre compte"}
      </h1>
      <p className="mt-4 text-sm leading-6 text-[#746d69]">
        {mode === "login"
          ? "Gérez votre audience, préparez vos campagnes et lisez leurs performances."
          : "Le premier compte créé devient administrateur de l’application."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 text-left">
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="auth-name">Nom</Label>
            <Input
              id="auth-name"
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={120}
              autoComplete="name"
              placeholder="Camille Dupont"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            maxLength={320}
            autoComplete="email"
            placeholder="vous@exemple.fr"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Mot de passe</Label>
          <Input
            id="auth-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder="8 caractères minimum"
          />
        </div>

        {formError && (
          <p className="rounded-xl border border-[#f2c9c1] bg-[#fdf1ef] px-3 py-2 text-sm text-[#b0432f]">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-[#ed7664] text-white hover:bg-[#d86655]"
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Se connecter" : "Créer le compte"}
        </Button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setFormError(null);
        }}
        className="mt-5 text-sm text-[#8a817c] underline decoration-dotted underline-offset-4 hover:text-[#d36353]"
      >
        {mode === "login"
          ? "Pas encore de compte ? S’inscrire"
          : "Vous avez déjà un compte ? Se connecter"}
      </button>
    </section>
  );
}
