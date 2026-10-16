import { PageHeader } from '../../shared/ui';

export function LegalPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <PageHeader title="Mentions légales" listen="Mentions légales. Le ministère de l'Agriculture, de l'Élevage et de la Pêche est responsable du traitement de vos données. Vous pouvez demander l'accès, la correction ou la suppression de vos données." />
      <p className="rounded border border-warn bg-warn-bg p-3 text-warn">Prototype de démonstration, données non officielles.</p>
      <section>
        <h2 className="text-xl font-semibold">Éditeur et responsable du traitement</h2>
        <p>Ministère de l'Agriculture, de l'Élevage et de la Pêche (MAEP), République du Bénin, Cotonou. Le prestataire technique agit en qualité de sous-traitant pour le compte du MAEP (loi n° 2017-20 portant Code du numérique, art. 328).</p>
        <p>Hébergement : à décider avec le comité de pilotage (CoPil). Aucune donnée personnelle n'est transférée hors du Bénin (art. 391).</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Données traitées</h2>
        <ul className="list-disc pl-6">
          <li>Identité : NPI, prénom, nom, sexe, date de naissance (vérifiés auprès de l'ANIP).</li>
          <li>Contact et localisation : téléphone, département, commune, langue préférée.</li>
          <li>Exploitation : parcelles (contour, surface, statut foncier), campagnes, candidatures aux programmes.</li>
          <li>Questions posées à l'assistant (sans donnée de santé ni photo de visage).</li>
        </ul>
        <p>Aucune donnée biométrique, ethnique, religieuse ou politique n'est collectée (art. 394).</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Finalités et base légale</h2>
        <p>Conseil agricole, alertes, accès aux programmes d'appui et pilotage du secteur. Traitement fondé sur votre consentement explicite, donné séparément et retirable à tout moment (art. 389 et 390). Pour un enfant de moins de 16 ans, le consentement d'un titulaire de l'autorité parentale est requis (art. 446).</p>
        <p>Aucune décision qui vous affecte (sélection, crédit) n'est prise par un traitement automatisé seul : un agent valide et motive, et vous pouvez contester (art. 401).</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Vos droits</h2>
        <p>Vous pouvez demander l'accès à vos données, leur correction, leur suppression, et retirer votre consentement dans « Mes consentements ». Les données sont conservées pour la durée nécessaire à la finalité (art. 433). Vous pouvez saisir l'Autorité de protection des données personnelles (APDP).</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Contact</h2>
        <p>Délégué à la protection des données du MAEP : <strong>à désigner</strong>.</p>
      </section>
    </article>
  );
}
