"""Diagnostic par photo (P1). SIMULATION : aucun modèle réel. Réponse déterministe tirée du hachage de l'image ;
confiance entre 0,4 et 0,9 pour qu'une partie des cas passe sous le seuil et soit renvoyée à un agronome."""
import hashlib

# code -> (libellé, filières concernées, conseil prudent sans dosage). Pathologies de DÉMONSTRATION.
PATHOLOGIES = {
    "chenille_legionnaire": ("Chenille légionnaire d'automne", ["mais"],
                             "Inspectez les cornets des plants et signalez les dégâts à votre agent ATDA."),
    "striure_mais": ("Virus de la striure du maïs", ["mais"],
                     "Arrachez les plants très atteints et demandez conseil à votre agent ATDA."),
    "jasside_coton": ("Jassides du cotonnier", ["coton"],
                      "Surveillez les feuilles qui jaunissent et suivez le programme de la filière coton."),
    "mosaique_manioc": ("Mosaïque africaine du manioc", ["manioc"],
                        "Utilisez des boutures saines et arrachez les plants malades."),
    "thrips_niebe": ("Thrips des fleurs du niébé", ["niebe"],
                     "Observez les fleurs et demandez à votre agent ATDA la conduite à tenir."),
    "anthracnose_anacarde": ("Anthracnose de l'anacardier", ["anacarde"],
                             "Taillez et brûlez les rameaux atteints, aérez le verger."),
    "pyriculariose_riz": ("Pyriculariose du riz", ["riz"],
                          "Évitez les excès d'engrais azoté et signalez les taches à votre agent ATDA."),
    "mildiou_tomate": ("Mildiou de la tomate", ["maraichage"],
                       "Évitez d'arroser le feuillage et retirez les feuilles atteintes."),
    "fletrissure_tomate": ("Flétrissement bactérien de la tomate", ["maraichage"],
                           "Arrachez les plants flétris et changez de parcelle à la prochaine saison."),
    "newcastle_volaille": ("Maladie de Newcastle (volaille)", ["elevage"],
                           "Isolez les animaux malades et appelez un vétérinaire sans attendre."),
}


# Niveau de risque de la pathologie (propagation, pertes) : valeurs de DÉMONSTRATION, à faire valider par l'INRAB.
RISK = {"chenille_legionnaire": "eleve", "striure_mais": "eleve", "mosaique_manioc": "eleve",
        "fletrissure_tomate": "eleve", "newcastle_volaille": "eleve", "jasside_coton": "moyen", "thrips_niebe": "moyen",
        "anthracnose_anacarde": "moyen", "pyriculariose_riz": "moyen", "mildiou_tomate": "moyen"}


class DiagnosisBackend:
    def diagnose(self, image_bytes: bytes, value_chain: str) -> dict:
        raise NotImplementedError


class SimulatedDiagnosis(DiagnosisBackend):
    def diagnose(self, image_bytes, value_chain):
        h = int.from_bytes(hashlib.sha256(image_bytes).digest()[:8], "big")
        codes = [c for c, (_, vcs, _) in PATHOLOGIES.items() if value_chain in vcs] or list(PATHOLOGIES)
        code = codes[h % len(codes)]
        label, _, advice = PATHOLOGIES[code]
        return {"pathology": code, "label": label, "confidence": round(0.4 + (h // 7 % 51) / 100, 2),
                "advice": advice, "simulated": True}


def get_backend() -> DiagnosisBackend:
    return SimulatedDiagnosis()
