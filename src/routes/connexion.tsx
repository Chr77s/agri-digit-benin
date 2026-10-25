import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, QrCode, Sprout, UserRound } from "lucide-react";
import illu from "@/assets/login.jpg";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Se connecter — AgriBénin" },
      { name: "description", content: "Connectez-vous avec votre numéro de téléphone, en tant que producteur ou agent / partenaire." },
      { property: "og:title", content: "Se connecter — AgriBénin" },
      { property: "og:description", content: "Accédez à votre espace producteur ou agent avec un code reçu par SMS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Connexion,
});

const DEMOS = [
  { label: "Agent ATDA · 01 97 00 00 02", tel: "0197000002" },
  { label: "Coopérative · 01 97 00 00 03", tel: "0197000003" },
  { label: "MAEP · 01 97 00 00 04", tel: "0197000004" },
];

function Connexion() {
  const [role, setRole] = useState<"prod" | "agent">("prod");
  const [tel, setTel] = useState("");
  const [demo, setDemo] = useState("0197000002");
  const valid = /^01\d{8}$/.test(tel);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 p-4 lg:grid-cols-2 lg:p-6">
        <div className="flex flex-col px-2 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Sprout className="h-4 w-4" /></span>
            AgriBénin
          </Link>

          <div className="mx-auto my-auto w-full max-w-md py-10">
            <h1 className="text-4xl font-medium md:text-5xl">Bon retour <span className="text-primary">parmi nous.</span></h1>
            <p className="mt-3 text-sm text-muted-foreground">Entrez votre numéro, nous vous envoyons un code par SMS.</p>

            <div role="tablist" aria-label="Type de compte" className="mt-8 grid grid-cols-2 rounded-full border border-border bg-muted p-1">
              {([["prod", "Producteur"], ["agent", "Agent ou partenaire"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={role === k} type="button" onClick={() => setRole(k)}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${role === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>

            <form key={role} className="animate-step-up mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); alert("Code envoyé (démo)"); }}>
              <div>
                <label htmlFor="tel" className="mb-1.5 block text-sm font-semibold">Numéro de téléphone</label>
                <p id="tel-hint" className="mb-2 text-xs text-muted-foreground">10 chiffres, commence par 01</p>
                <div className="flex overflow-hidden rounded-xl border border-border transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="grid place-items-center border-r border-border bg-secondary px-4 text-sm font-bold text-secondary-foreground">+229</span>
                  <input id="tel" inputMode="numeric" autoComplete="tel" aria-describedby="tel-hint" maxLength={10} value={tel}
                    onChange={(e) => setTel(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-background px-4 py-3 text-sm outline-none" />
                </div>
              </div>
              <button type="submit" disabled={!valid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                Recevoir le code <ArrowRight className="h-4 w-4" />
              </button>

              <div className="space-y-3 border-t border-dashed border-border pt-5">
                {role === "agent" && (
                  <div>
                    <label htmlFor="demo" className="mb-1.5 block text-sm font-semibold">Compte de démonstration</label>
                    <select id="demo" value={demo} onChange={(e) => setDemo(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary">
                      {DEMOS.map((d) => <option key={d.tel} value={d.tel}>{d.label}</option>)}
                    </select>
                  </div>
                )}
                <button type="button" onClick={() => setTel(role === "agent" ? demo : "0197000001")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-primary transition hover:bg-muted">
                  <UserRound className="h-4 w-4" /> Démo
                </button>
                <p className="text-xs text-muted-foreground">
                  {role === "agent"
                    ? "Remplit le numéro, le mot de passe et le code du compte de test choisi."
                    : "Remplit le compte de test du producteur Bio GOUNOU (01 97 00 00 01) et le code reçu."}{" "}
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">Simulation</span>
                </p>
              </div>
            </form>

            {role === "prod" && (
              <div className="mt-8 space-y-4 border-t border-border pt-6 text-sm font-semibold">
                <Link to="/inscription" className="flex items-center gap-2 hover:text-primary">S'inscrire comme producteur <ArrowRight className="h-4 w-4" /></Link>
                <a href="#" className="flex items-center gap-2 hover:text-primary"><QrCode className="h-4 w-4" /> Vérifier une carte de producteur</a>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden flex-col items-center justify-center rounded-3xl bg-secondary p-10 lg:flex">
          <img src={illu} alt="" width={1024} height={1024} className="w-full max-w-md mix-blend-multiply" />
          <p className="mt-6 max-w-sm text-center font-display text-2xl">Votre exploitation, <span className="font-semibold text-primary">en sécurité</span> dans votre poche.</p>
        </aside>
      </div>
    </div>
  );
}
