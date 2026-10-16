"""Canaux de notification. InApp réel ; SMS et vocal SIMULÉS (écrits dans l'Outbox, rien n'est envoyé)."""
import math

GSM7 = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿"
    "abcdefghijklmnopqrstuvwxyzäöñüà"
)
GSM7_EXT = set("^{}\\[~]|€")


def sms_segments(text):
    """Renvoie (encodage, nb_segments) : 160/153 en GSM-7, 70/67 en UCS-2."""
    if all(c in GSM7 or c in GSM7_EXT for c in text):
        units = sum(2 if c in GSM7_EXT else 1 for c in text)
        return "GSM-7", 1 if units <= 160 else math.ceil(units / 153)
    n = len(text.encode("utf-16-le")) // 2
    return "UCS-2", 1 if n <= 70 else math.ceil(n / 67)


class NotificationChannel:
    name = ""

    def send(self, to, body, user=None, title="", department=""):
        raise NotImplementedError


class InAppChannel(NotificationChannel):
    name = "in_app"

    def send(self, to, body, user=None, title="", department=""):
        from apps.alerts.models import Notification

        if user is None:
            return None
        return Notification.objects.create(user=user, title=title, body=body)


class SmsChannel(NotificationChannel):
    """SIMULATION : écrit dans l'Outbox. Remplacer par un fournisseur SMS réel en production."""

    name = "sms"

    def send(self, to, body, user=None, title="", department=""):
        from apps.alerts.models import Outbox

        enc, seg = sms_segments(body)
        return Outbox.objects.create(channel=self.name, to=to, body=body, segments=seg, encoding=enc,
                                     status="livre", department=department)


class VoiceChannel(SmsChannel):
    """SIMULATION : message vocal enregistré dans l'Outbox (synthèse côté navigateur dans le prototype)."""

    name = "voice"


CHANNELS = {"in_app": InAppChannel(), "sms": SmsChannel(), "voice": VoiceChannel()}


def get_channel(name) -> NotificationChannel:
    return CHANNELS[name]


assert sms_segments("a" * 160) == ("GSM-7", 1) and sms_segments("a" * 161) == ("GSM-7", 2)
assert sms_segments("ɖ" * 70) == ("UCS-2", 1) and sms_segments("ɖ" * 71) == ("UCS-2", 2)
