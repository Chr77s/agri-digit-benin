import json
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import RetentionPolicy
from apps.knowledge.models import KnowledgeDoc, KnowledgeDocVersion
from apps.parcels.models import Campaign, Parcel
from apps.parcels.services import area_ha
from apps.producers.models import Consent, Producer, ProducerVersion
from apps.producers.services import next_code, snapshot
from apps.programs.models import Program
from apps.referentiel.data import DEPARTMENTS, VALUE_CHAINS, slug
from apps.referentiel.services import load_referentiels
from integrations.anip import FICHES

PASSWORD = "AgriDemo-2026!"
STAFF = [
    ("0197000002", "Agent ATDA Alibori (démo)", "agent_atda", "alibori"),
    ("0197000003", "Agronome INRAB (démo)", "agronome_inrab", ""),
    ("0197000004", "Responsable de programme (démo)", "responsable_programme", ""),
    ("0197000005", "Administrateur MAEP (démo)", "admin_maep", ""),
    ("0197000006", "Auditeur CoPil (démo)", "auditeur_copil", ""),
    ("0197000007", "Agent financier (démo)", "agent_financier", ""),
]

# Fiches de secours SANS dosage chiffré, marquées « a_sourcer » (à valider par l'INRAB).
FALLBACK = {
    "mais": ("Maïs : période de semis", "Au nord du Bénin (Alibori, Banikoara), on sème le maïs au début de la "
             "saison des pluies, généralement de fin mai à début juillet, quand les pluies sont bien installées et le "
             "sol humide sur 10 cm. Semer en lignes après un labour ou un grattage. Éviter de semer après une seule "
             "pluie isolée. Confirmer le calendrier local avec l'agent ATDA."),
    "coton": ("Coton : préparation et semis", "Le coton se sème en début de saison des pluies, en lignes, sur un sol "
              "préparé. Le démariage se fait après la levée. Suivre le calendrier de la filière et l'agent ATDA."),
    "anacarde": ("Anacarde : entretien du verger", "Désherber autour des arbres avant la saison sèche et créer des "
                 "pare-feux. Récolter les noix tombées au sol et les sécher au soleil avant stockage."),
    "ananas": ("Ananas : plantation", "Planter des rejets sains de taille homogène sur un sol bien drainé, en début de "
               "saison des pluies. Butter légèrement et désherber régulièrement."),
    "riz": ("Riz : repiquage en bas-fond", "Préparer les diguettes et planer la parcelle. Repiquer les plants jeunes "
            "en lignes. Garder une lame d'eau adaptée et désherber tôt."),
    "soja": ("Soja : semis", "Semer le soja en lignes sur sol bien préparé au début de la saison des pluies. Inoculer "
             "les semences si l'agent le recommande. Désherber dans les premières semaines."),
    "manioc": ("Manioc : bouturage", "Utiliser des boutures saines prélevées sur des tiges mûres. Planter en début de "
               "saison des pluies, inclinées ou à plat, sur billons ou buttes."),
    "niebe": ("Niébé : semis et stockage", "Semer le niébé en lignes après l'installation des pluies. Récolter les "
              "gousses sèches et stocker les graines bien sèches dans des sacs hermétiques."),
    "elevage": ("Élevage : hygiène du poulailler", "Nettoyer et désinfecter régulièrement le poulailler, fournir de "
                "l'eau propre et isoler les animaux malades. Pour tout traitement, consulter un vétérinaire."),
    "peche_aquaculture": ("Aquaculture : qualité de l'eau", "Surveiller la couleur et l'odeur de l'eau des étangs, "
                          "éviter la surpopulation et ne pas suralimenter les poissons."),
}


def _square(lon, lat, side_deg=0.009):
    return {"type": "Polygon", "coordinates": [[[lon, lat], [lon + side_deg, lat], [lon + side_deg, lat + side_deg],
                                                [lon, lat + side_deg], [lon, lat]]]}


class Command(BaseCommand):
    help = "Données de démonstration (idempotent) : référentiels, comptes, producteurs, parcelles, programmes, fiches."

    @transaction.atomic
    def handle(self, *args, **opts):
        load_referentiels()
        RetentionPolicy.objects.get_or_create(data_type="audit_log", defaults={
            "retention_days": settings.AUDIT_RETENTION_DAYS, "description": "Journal d'audit (5 ans)"})
        for phone, name, role, dep in STAFF:
            u, created = User.objects.get_or_create(phone=phone, defaults={"full_name": name, "role": role,
                                                                           "department": dep})
            if created:
                u.set_password(PASSWORD)
                u.is_staff = role in ("agronome_inrab", "admin_maep")
                u.save()
        if User.objects.filter(phone="0197000003").exists():
            from django.contrib.auth.models import Permission

            u = User.objects.get(phone="0197000003")
            u.user_permissions.set(Permission.objects.filter(content_type__app_label="knowledge"))
        self._producer("1000000001", "0197000001", "alibori", "banikoara", 0)
        for i in range(5, 46):
            name, _, communes = DEPARTMENTS[i % 12]
            self._producer(f"10000000{i:02d}", f"01960000{i:02d}", slug(name), slug(communes[i % len(communes)]), i)
        self._programs()
        self._knowledge()
        self.stdout.write(self.style.SUCCESS(
            f"Seed OK : {User.objects.count()} comptes, {Producer.objects.count()} producteurs, "
            f"{Parcel.objects.count()} parcelles, {KnowledgeDoc.objects.count()} fiches"))

    def _producer(self, npi, phone, dep, commune, i):
        if Producer.objects.filter(npi=npi).exists():
            return
        f = FICHES[npi]
        user, _ = User.objects.get_or_create(phone=phone, defaults={
            "full_name": f"{f.first_name} {f.last_name}", "role": "producteur", "department": dep, "commune": commune})
        status = "en_attente" if i % 7 == 3 else "valide"
        p = Producer.objects.create(code=next_code(), npi=npi, first_name=f.first_name, last_name=f.last_name,
                                    sex=f.sex, birth_date=f.birth_date, department=dep, commune=commune, phone=phone,
                                    language="fr", status=status, user=user,
                                    validated_at=timezone.now() if status == "valide" else None)
        Consent.objects.create(producer=p, type="donnees_personnelles", text_version="v1", channel="seed")
        ProducerVersion.objects.create(producer=p, version=1, data=snapshot(p), reason="seed")
        center = next(c for n, c, _ in DEPARTMENTS if slug(n) == dep)
        lon, lat = center[0] + (i % 6) * 0.03 - 0.08, center[1] + (i // 6) * 0.02 - 0.06
        geom = _square(lon, lat)
        parcel = Parcel.objects.create(producer=p, name=f"Champ {i or 1}", geometry=geom, land_type="pluvial_plateau",
                                       tenure="coutumier", area_ha=area_ha(geom), department=dep)
        Campaign.objects.create(parcel=parcel, value_chain="mais" if i == 0 else VALUE_CHAINS[i % 10][0],
                                season="2026-pluie-1", stage="croissance")

    def _programs(self):
        for name, desc, chains, closes in [
            ("Subvention intrants maïs 2026", "Appui en semences et intrants pour les producteurs de maïs.", ["mais"],
             date(2026, 12, 31)),
            ("Appui coton 2025", "Appui aux producteurs de coton, campagne 2025.", ["coton"], date(2025, 12, 31)),
            ("Appui soja 2026", "Appui à la production de soja.", ["soja"], date(2027, 3, 31)),
        ]:
            Program.objects.get_or_create(name=name, defaults={
                "description": desc, "conditions": "Producteur inscrit et validé. Données fictives de démonstration.",
                "value_chains": chains, "closes_at": closes})

    def _knowledge(self):
        files = sorted(Path(settings.BASE_DIR / "data/knowledge").glob("*.json"))
        items = []
        for fp in files:
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            items += [d for d in data if isinstance(d, dict) and d.get("title") and d.get("body")]
        has_maize_sowing = any(d.get("value_chain") == "mais" and "sem" in (d["title"] + d["body"]).lower()
                               and d.get("status", "publie") == "publie" for d in items)
        if not items or not has_maize_sowing:
            items += [{"value_chain": vc, "title": t + " (fiche de démonstration, à sourcer)", "body": b,
                       "source": "a_sourcer", "status": "publie", "language": "fr"}
                      for vc, (t, b) in FALLBACK.items() if not items or vc == "mais"]
        for d in items:
            status = d.get("status", "brouillon")
            status = status if status in ("brouillon", "relu", "publie") else "brouillon"
            doc, created = KnowledgeDoc.objects.get_or_create(
                value_chain=d.get("value_chain", "mais"), title=d["title"][:200],
                defaults={"body": d["body"], "source": (d.get("source") or "a_sourcer")[:500], "status": status,
                          "language": d.get("language", "fr"),
                          "language_validation": "valide" if d.get("language", "fr") == "fr" else "non_valide"})
            if created:
                KnowledgeDocVersion.objects.create(doc=doc, version=1, title=doc.title, body=doc.body,
                                                   source=doc.source, status=doc.status)
