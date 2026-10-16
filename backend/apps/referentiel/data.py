"""Référentiels : 10 filières, 12 départements et 77 communes du Bénin (centres approximatifs lon/lat)."""
import re
import unicodedata

VALUE_CHAINS = [
    ("coton", "Coton"), ("anacarde", "Anacarde"), ("ananas", "Ananas"), ("mais", "Maïs"), ("riz", "Riz"),
    ("soja", "Soja"), ("manioc", "Manioc"), ("niebe", "Niébé"), ("elevage", "Élevage (volaille et ruminants)"),
    ("peche_aquaculture", "Pêche et aquaculture"),
]

# nom, centre approximatif (lon, lat), communes
DEPARTMENTS = [
    ("Alibori", (2.75, 11.35), ["Banikoara", "Gogounou", "Kandi", "Karimama", "Malanville", "Segbana"]),
    ("Atacora", (1.55, 10.6), ["Boukoumbé", "Cobly", "Kérou", "Kouandé", "Matéri", "Natitingou", "Péhunco",
                               "Tanguiéta", "Toucountouna"]),
    ("Atlantique", (2.2, 6.6), ["Abomey-Calavi", "Allada", "Kpomassè", "Ouidah", "Sô-Ava", "Toffo",
                                "Tori-Bossito", "Zè"]),
    ("Borgou", (2.75, 9.6), ["Bembèrèkè", "Kalalé", "N'Dali", "Nikki", "Parakou", "Pèrèrè", "Sinendé", "Tchaourou"]),
    ("Collines", (2.25, 8.1), ["Bantè", "Dassa-Zoumè", "Glazoué", "Ouèssè", "Savalou", "Savè"]),
    ("Couffo", (1.75, 7.0), ["Aplahoué", "Djakotomey", "Dogbo", "Klouékanmè", "Lalo", "Toviklin"]),
    ("Donga", (1.75, 9.5), ["Bassila", "Copargo", "Djougou", "Ouaké"]),
    ("Littoral", (2.42, 6.37), ["Cotonou"]),
    ("Mono", (1.8, 6.5), ["Athiémé", "Bopa", "Comè", "Grand-Popo", "Houéyogbé", "Lokossa"]),
    ("Ouémé", (2.55, 6.6), ["Adjarra", "Adjohoun", "Aguégués", "Akpro-Missérété", "Avrankou", "Bonou", "Dangbo",
                            "Porto-Novo", "Sèmè-Kpodji"]),
    ("Plateau", (2.6, 7.2), ["Adja-Ouèrè", "Ifangni", "Kétou", "Pobè", "Sakété"]),
    ("Zou", (2.2, 7.2), ["Abomey", "Agbangnizoun", "Bohicon", "Covè", "Djidja", "Ouinhi", "Zagnanado", "Za-Kpota",
                         "Zogbodomey"]),
]


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def nearest_department(lon, lat):
    return min(DEPARTMENTS, key=lambda d: (d[1][0] - lon) ** 2 + (d[1][1] - lat) ** 2)


assert len(DEPARTMENTS) == 12 and sum(len(d[2]) for d in DEPARTMENTS) == 77
