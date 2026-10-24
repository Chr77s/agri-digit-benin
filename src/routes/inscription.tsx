import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Languages, Sprout, Volume2 } from "lucide-react";
import illu from "@/assets/signup.jpg";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription producteur — AgriBénin" },
      { name: "description", content: "Créez votre compte producteur en 5 étapes : identité NPI, contact, langue, consentement et récapitulatif." },
      { property: "og:title", content: "Inscription producteur — AgriBénin" },
      { property: "og:description", content: "Inscrivez votre exploitation en quelques minutes avec votre numéro." },
    ],
  }),
  component: Inscription,
});

const STEPS = ["Identité NPI", "Contact et commune", "Langue", "Consentement", "Récapitulatif"];
const COMMUNES: Record<string, string[]> = {
  Alibori: ["Banikoara", "Gogounou", "Kandi", "Karimama", "Malanville", "Ségbana"],
  Atacora: ["Boukoumbé", "Cobly", "Kérou", "Kouandé", "Natitingou", "Tanguiéta"],
  Atlantique: ["Abomey-Calavi", "Allada", "Ouidah", "Tori-Bossito", "Zè"],
  Borgou: ["Bembèrèkè", "Kalalé", "Nikki", "Parakou", "Tchaourou"],
  Collines: ["Bantè", "Dassa-Zoumè", "Glazoué", "Savalou", "Savè"],
  Couffo: ["Aplahoué", "Djakotomey", "Dogbo", "Klouékanmè", "Lalo"],
  Donga: ["Bassila", "Copargo", "Djougou", "Ouaké"],
  Littoral: ["Cotonou"],
  Mono: ["Athiémé", "Bopa", "Comè", "Grand-Popo", "Lokossa"],
  Ouémé: ["Adjarra", "Akpro-Missérété", "Avrankou", "Porto-Novo", "Sèmè-Kpodji"],
  Plateau: ["Adja-Ouèrè", "Ifangni", "Kétou", "Pobè", "Sakété"],
  Zou: ["Abomey", "Bohicon", "Covè", "Djidja", "Zogbodomey"],
};
const LANGS = ["Français", "Fon", "Bariba", "Yoruba", "Dendi"];

const input = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const label = "mb-1.5 block text-sm font-semibold";
const hint = "mb-2 text-xs text-muted-foreground";

function Inscription() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [f, setF] = useState({ npi: "", prenom: "", nom: "", sexe: "", naissance: "", dep: "", commune: "", tel: "", langue: "Français", ok: false });
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); };

  const valid = [
    /^\d{10}$/.test(f.npi) && f.prenom && f.nom && f.sexe && f.naissance,
    f.dep && f.commune && /^01\d{8}$/.test(f.tel),
    !!f.langue,
    f.ok,
    true,
  ][step];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 p-4 lg:grid-cols-2 lg:p-6">
        <div className="flex flex-col px-2 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Sprout className="h-4 w-4" /></span>
            AgriBénin
          </Link>

          <div className="mt-10">
            <h1 className="text-4xl font-medium md:text-5xl">Créer mon compte <span className="text-primary">producteur.</span></h1>
            <p className="mt-3 text-sm text-muted-foreground">Cinq petites étapes. Votre agent ATDA validera ensuite votre fiche.</p>
          </div>

          <div className="mt-10 flex flex-1 gap-6 sm:gap-8">
            {/* Vertical progress */}
            <ol className="relative flex shrink-0 flex-col justify-between py-1">
              <span className="absolute left-4 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-border" />
              <span className="absolute left-4 top-4 w-0.5 -translate-x-1/2 bg-primary transition-all duration-500" style={{ height: `calc((100% - 2rem) * ${step / (STEPS.length - 1)})` }} />
              {STEPS.map((s, i) => (
                <li key={s} className="relative flex items-center gap-3">
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => go(i)}
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "scale-110 border-primary bg-background text-primary ring-4 ring-primary/15" : "border-border bg-background text-muted-foreground"}`}
                    aria-label={s}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </button>
                  <span className={`hidden text-xs font-semibold xl:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                </li>
              ))}
            </ol>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div key={step} className={dir === 1 ? "animate-step-up" : "animate-step-down"}>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Étape {step + 1} sur {STEPS.length}</p>
                {step === 0 && (
                  <Section title="Identité (vérifiée auprès de l'ANIP)" desc="Recopiez exactement ce qui figure sur votre carte ou votre certificat d'identification.">
                    <div>
                      <label className={label}>NPI <span className="font-normal text-muted-foreground">(numéro personnel d'identification)</span></label>
                      <p className={hint}>10 chiffres. Il est vérifié auprès de l'ANIP à l'envoi.</p>
                      <input className={input} inputMode="numeric" maxLength={10} value={f.npi} onChange={(e) => set("npi", e.target.value.replace(/\D/g, ""))} placeholder="0000000000" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className={label}>Prénom</label><input className={input} value={f.prenom} onChange={(e) => set("prenom", e.target.value)} /></div>
                      <div><label className={label}>Nom</label><input className={input} value={f.nom} onChange={(e) => set("nom", e.target.value)} /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className={label}>Date de naissance</label><input type="date" className={input} value={f.naissance} onChange={(e) => set("naissance", e.target.value)} /></div>
                      <div>
                        <label className={label}>Sexe</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Femme", "Homme"].map((s) => (
                            <button type="button" key={s} onClick={() => set("sexe", s)} className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${f.sexe === s ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary"}`}>{s}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Section>
                )}
                {step === 1 && (
                  <Section title="Contact et localisation" desc="Votre commune désigne l'agent ATDA qui validera votre fiche.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={label}>Département</label>
                        <select className={input} value={f.dep} onChange={(e) => { set("dep", e.target.value); set("commune", ""); }}>
                          <option value="">Choisir</option>
                          {Object.keys(COMMUNES).map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={label}>Commune</label>
                        <select className={`${input} disabled:bg-muted disabled:text-muted-foreground`} disabled={!f.dep} value={f.commune} onChange={(e) => set("commune", e.target.value)}>
                          <option value="">{f.dep ? "Choisir" : "Choisissez d'abord le département"}</option>
                          {(COMMUNES[f.dep] ?? []).map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={label}>Téléphone</label>
                      <p className={hint}>10 chiffres, commence par 01. Ce numéro reçoit vos codes de connexion et vos alertes.</p>
                      <div className="flex overflow-hidden rounded-xl border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                        <span className="grid place-items-center bg-secondary px-4 text-sm font-semibold text-primary">+229</span>
                        <input className="w-full bg-background px-4 py-3 text-sm outline-none" inputMode="numeric" maxLength={10} value={f.tel} onChange={(e) => set("tel", e.target.value.replace(/\D/g, ""))} placeholder="01 00 00 00 00" />
                      </div>
                    </div>
                  </Section>
                )}
                {step === 2 && (
                  <Section title="Langue préférée" desc="Langue des SMS, des messages vocaux et de l'assistant.">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {LANGS.map((l) => {
                        const on = f.langue === l; const dispo = l === "Français";
                        return (
                          <button type="button" key={l} onClick={() => set("langue", l)} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${on ? "border-primary bg-secondary" : "border-border hover:border-primary"}`}>
                            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${on ? "border-primary" : "border-border"}`}>{on && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                            <span><span className="block text-sm font-semibold">{l}</span><span className={`text-xs ${dispo ? "text-primary" : "text-muted-foreground"}`}>{dispo ? "Disponible" : "Traduction en cours de validation"}</span></span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 rounded-xl bg-accent-soft p-4 text-xs text-foreground">
                      <Languages className="h-4 w-4 shrink-0 text-accent" />
                      Les textes en langues nationales sont validés avec le MTDI avant diffusion. En attendant, vous recevez les messages en français, et vous pourrez changer de langue plus tard dans votre profil.
                    </div>
                  </Section>
                )}
                {step === 3 && (
                  <Section title="Consentement" desc="Lisez ou écoutez le texte avant de donner votre accord.">
                    <div className="rounded-xl border border-border bg-muted p-5 text-sm leading-relaxed">
                      J'accepte que le Ministère de l'agriculture, de l'élevage et de la pêche (MAEP), responsable du traitement, enregistre mes informations (identité, téléphone, commune, parcelles) pour me fournir des conseils agricoles, des alertes et l'accès aux programmes d'appui. Mes données ne sont pas vendues ni envoyées hors du Bénin. Je peux retirer ce consentement à tout moment dans « Mes consentements ».
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <button type="button" className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary"><Volume2 className="h-4 w-4" /> Écouter le texte</button>
                      <a href="#" className="text-xs text-muted-foreground underline">Lire la politique de confidentialité</a>
                    </div>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 text-sm font-semibold transition hover:border-primary">
                      <input type="checkbox" className="h-5 w-5 accent-primary" checked={f.ok} onChange={(e) => set("ok", e.target.checked)} />
                      J'ai lu ce texte et je donne mon consentement.
                    </label>
                    <p className="text-xs text-muted-foreground">Ce consentement est séparé des conditions d'utilisation. Le partage de votre profil avec un organisme de crédit vous sera demandé à part, plus tard, et restera facultatif.</p>
                  </Section>
                )}
                {step === 4 && (
                  <Section title="Récapitulatif" desc="Vérifiez vos informations avant l'envoi à votre agent ATDA.">
                    <dl className="divide-y divide-border rounded-xl border border-border">
                      {[
                        ["NPI", f.npi], ["Nom complet", `${f.prenom} ${f.nom}`], ["Sexe", f.sexe], ["Date de naissance", f.naissance],
                        ["Commune", `${f.commune} (${f.dep})`], ["Téléphone", `+229 ${f.tel}`], ["Langue", f.langue], ["Consentement", f.ok ? "Donné" : "Non donné"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
                      ))}
                    </dl>
                  </Section>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
                {step > 0 ? (
                  <button type="button" onClick={() => go(step - 1)} className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Retour</button>
                ) : <span />}
                <button
                  type="button"
                  disabled={!valid}
                  onClick={() => step < 4 ? go(step + 1) : alert("Inscription envoyée (démo)")}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {step === 3 ? "Voir le récapitulatif" : step === 4 ? "Envoyer mon inscription" : "Continuer"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">Déjà inscrit ? <a href="#" className="font-semibold text-primary">Se connecter</a></p>
            </div>
          </div>
        </div>

        <aside className="hidden flex-col items-center justify-center rounded-3xl bg-secondary p-10 lg:flex">
          <img src={illu} alt="Productrice inscrivant son exploitation sur son téléphone" width={1024} height={1024} className="w-full max-w-md mix-blend-multiply" />
          <div className="mt-6 flex gap-1.5">
            {STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />)}
          </div>
          <p className="mt-6 max-w-sm text-center font-display text-2xl">Suivez vos cultures et vendez vos récoltes avec <span className="font-semibold text-primary">AgriBénin</span></p>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <h2 className="text-2xl font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}
