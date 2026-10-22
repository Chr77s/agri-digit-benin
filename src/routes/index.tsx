import { createFileRoute } from "@tanstack/react-router";
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
          <a href="#" className={`${btnGhost} hidden sm:inline-flex !py-2`}>Se connecter</a>
          <a href="#" className={`${btnPrimary} !py-2`}>S'inscrire</a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Ministère de l'agriculture, de l'élevage et de la pêche</span>
          <h1 className="mt-5 text-5xl font-medium leading-[1.05] md:text-6xl">Votre champ dans votre <span className="text-primary">téléphone.</span></h1>
          <p className="mt-5 max-w-md text-muted-foreground">Inscrivez-vous avec votre numéro. Suivez vos cultures et vendez vos récoltes, simplement.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#" className={btnPrimary}>Créer mon compte producteur <ArrowRight className="h-4 w-4" /></a>
            <a href="#" className={btnGhost}>Se connecter</a>
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
          <a href="#" className={btnPrimary}>Commencer</a>
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

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© 2026 AgriBénin — République du Bénin</footer>
    </div>
  );
}
