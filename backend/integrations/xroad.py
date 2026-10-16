"""Interface X-Road (échanges inter-administrations : ANIP, SONAMA, FNDA). Vide : nécessite une convention
et un certificat membre délivrés par l'administration béninoise (action humaine)."""


class XRoadClient:
    def call(self, member: str, service: str, payload: dict) -> dict:
        raise NotImplementedError("Raccordement X-Road non disponible dans le prototype.")
