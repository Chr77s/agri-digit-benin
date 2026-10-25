import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sprout, Users, Building2, Landmark, WifiOff, Languages, ShieldCheck, Eye } from "lucide-react";
import hero from "@/assets/hero.jpg";
import step1 from "@/assets/step1.jpg";
import step2 from "@/assets/step2.jpg";
import step3 from "@/assets/step3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Votre champ dans votre téléphone — Plateforme agricole du Bénin" },
      { name: "description", content: "Inscrivez votre exploitation avec votre numéro, faites-la valider par votre agent ATDA, suivez et vendez vos récoltes." },
      { property: "og:title", content: "Votre champ dans votre téléphone" },
      { property: "og:description", content: "La plateforme simple des producteurs agricoles du Bénin." },
    ],
  }),
  component: Index,
});

const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90";
const btnGhost = "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted";

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Sprout className="h-4 w-4" /></span>
          AgriBénin
        </div>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#etapes" className="hover:text-foreground">Comment ça marche</a>
          <a href="#acteurs" className="hover:text-foreground">Pour qui</a>
          <a href="#garanties" className="hover:text-foreground">Nos garanties</a>
        </nav>
        <div className="flex gap-2">
          <Link to="/connexion" className={`${btnGhost} hidden sm:inline-flex !py-2`}>Se connecter</Link>
          <Link to="/inscription" className={`${btnPrimary} !py-2`}>S'inscrire</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Ministère de l'agriculture, de l'élevage et de la pêche</span>
          <h1 className="mt-5 text-5xl font-medium leading-[1.05] md:text-6xl">Votre champ dans votre <span className="text-primary">téléphone.</span></h1>
          <p className="mt-5 max-w-md text-muted-foreground">Inscrivez-vous avec votre numéro. Suivez vos cultures et vendez vos récoltes, simplement.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/inscription" className={btnPrimary}>Créer mon compte producteur <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/connexion" className={btnGhost}>Se connecter</Link>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-2 divide-x divide-border border-t border-border pt-6">
            <div><p className="font-display text-3xl">200 873</p><p className="text-xs text-muted-foreground">fermes du PDC</p></div>
            <div className="pl-6"><p className="font-display text-3xl">77</p><p className="text-xs text-muted-foreground">communes couvertes</p></div>
          </div>
        </div>
        <img src={hero} alt="Producteur consultant son champ sur son téléphone" width={1280} height={1024} className="w-full" />
      </section>

      <section className="border-y border-border bg-muted">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid h-16 place-items-center rounded-xl border border-dashed border-border bg-background font-display text-base tracking-[0.3em] text-muted-foreground">LOGO</div>
          ))}
        </div>
      </section>

      <section id="etapes" className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-medium">Trois étapes, et votre exploitation est en ligne.</h2>
            <p className="mt-3 text-muted-foreground">Pas besoin d'être expert. Votre agent vous accompagne.</p>
          </div>
          <Link to="/inscription" className={btnPrimary}>Commencer</Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            [step1,"Inscrivez-vous","Avec votre simple numéro de téléphone."],
            [step2,"Validation ATDA","Votre agent vérifie et valide votre fiche."],
            [step3,"Suivez et vendez","Recevez des conseils et vendez vos récoltes."],
          ].map(([img,t,d],i)=>(
            <article key={t} className="rounded-2xl border border-border p-6 transition hover:border-primary">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i===2?"bg-accent text-accent-foreground":"bg-primary text-primary-foreground"}`}>{i+1}</span>
              <img src={img} alt={t} loading="lazy" width={912} height={736} className="my-4 aspect-[5/4] w-full object-contain" />
              <h3 className="text-lg font-medium">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="acteurs" className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-4xl font-medium">Une plateforme, tous les acteurs.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[[Sprout,"Producteurs"],[Users,"Agents ATDA"],[Building2,"Coopératives"],[Landmark,"MAEP et MTDI"]].map(([Icon,l],i)=>{
            const I = Icon as typeof Sprout;
            return (
              <div key={l as string} className="rounded-2xl border border-border p-6">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${i%2?"bg-accent-soft text-accent":"bg-secondary text-primary"}`}><I className="h-5 w-5" /></span>
                <p className="mt-6 font-semibold">{l as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="garanties" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl bg-primary px-8 py-14 text-primary-foreground md:px-14">
          <h2 className="max-w-lg text-4xl font-medium">Pensé pour le terrain, construit pour la confiance.</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {[[WifiOff,"Même sans réseau"],[Languages,"Dans votre langue"],[ShieldCheck,"Vos données vous appartiennent"],[Eye,"Chaque accès est tracé"]].map(([Icon,l])=>{
              const I = Icon as typeof Sprout;
              return <div key={l as string}><I className="h-6 w-6 text-accent" /><p className="mt-3 text-sm font-semibold">{l as string}</p></div>;
            })}
          </div>
        </div>
      </section>

      <footer className="w-full">
        <div className="relative overflow-hidden rounded-t-[3rem] bg-primary pb-10 pt-20 text-primary-foreground">
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-15" viewBox="0 0 800 400" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M0 80 C200 20 300 160 500 90 S800 60 800 60" /><path d="M0 160 C180 100 320 240 520 170 S800 140 800 140" /><path d="M0 260 C220 200 300 340 540 260 S800 230 800 230" /><path d="M0 340 C200 300 360 400 560 340 S800 320 800 320" />
          </svg>
          <span className="absolute left-1/2 top-0 grid h-20 w-20 -translate-x-1/2 -translate-y-1/3 place-items-center rounded-3xl bg-accent text-accent-foreground shadow-lg"><Sprout className="h-10 w-10" /></span>

          <div className="relative mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="font-display text-4xl font-semibold md:text-5xl">Agri-Digit Bénin</p>
            <p className="mx-auto mt-3 max-w-md text-sm opacity-80">La plateforme agricole du Bénin : parcelles, conseils, appuis et marché au même endroit.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/inscription" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90">Créer un compte producteur <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/connexion" className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-primary-foreground/10">Se connecter <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>

          <div className="relative mt-14 grid gap-10 text-sm sm:grid-cols-2 md:grid-cols-4">
            {[
              ["La plateforme", ["Comment ça marche", "Pour qui", "Nos garanties", "Partenaires", "Questions fréquentes"]],
              ["Mon espace", ["Créer un compte producteur", "Se connecter", "Vérifier une carte producteur"]],
              ["Aide", ["Contact et assistance", "Plan du site", "Accessibilité"]],
              ["Informations légales", ["Mentions légales", "Politique de confidentialité", "Conditions d'utilisation"]],
            ].map(([t, items]) => (
              <div key={t as string}>
                <p className="font-display text-lg font-semibold">{t as string}</p>
                <ul className="mt-3 space-y-1.5 opacity-80">
                  {(items as string[]).map((i) => <li key={i}><a href="#" className="hover:text-accent">{i}</a></li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="relative mt-12 flex flex-col gap-4 border-t border-primary-foreground/15 pt-6 text-xs md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 opacity-80">
              <p>© 2026 Ministère de l'agriculture, de l'élevage et de la pêche (MAEP), République du Bénin.</p>
              <p>Prototype de démonstration : les données affichées ne sont pas officielles.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-foreground">FR</span>
              <a href="#" className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-foreground">↑ Retour en haut</a>
            </div>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
