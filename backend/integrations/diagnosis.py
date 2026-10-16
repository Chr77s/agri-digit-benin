"""Diagnostic par photo (P1). SIMULATION : aucun modèle réel ; confiance basse -> renvoi à un agronome."""


class DiagnosisBackend:
    def diagnose(self, image_bytes: bytes, value_chain: str) -> dict:
        raise NotImplementedError


class SimulatedDiagnosis(DiagnosisBackend):
    def diagnose(self, image_bytes, value_chain):
        return {"label": "indetermine", "confidence": 0.3, "simulated": True, "escalate_to_agronomist": True}


class XRoadPlaceholder:
    pass
