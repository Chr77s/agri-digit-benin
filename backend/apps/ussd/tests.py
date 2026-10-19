from apps.alerts.models import Notification, Outbox
from apps.audit.models import AuditLog
from apps.ussd.services import MAX_CHARS, handle
from conftest import client_for

URL = "/api/v1/ussd/gateway"


def ussd(c, phone, text, **headers):
    r = c.post(URL, {"sessionId": "s1", "phoneNumber": phone, "text": text}, format="json", **headers)
    return r.status_code, r.content.decode()


def test_gateway_is_closed_without_demo_or_key(settings):
    settings.DEMO_MODE, settings.USSD_GATEWAY_KEY = False, ""
    assert client_for().post(URL, {"sessionId": "s", "phoneNumber": "0197000001"}, format="json").status_code == 404
    settings.USSD_GATEWAY_KEY = "k-op"
    assert ussd(client_for(), "0197000001", "", HTTP_X_GATEWAY_KEY="faux")[0] == 404
    code, body = ussd(client_for(), "+229 01 97 00 00 01", "", HTTP_X_GATEWAY_KEY="k-op")
    assert code == 200 and body.startswith("CON AGRI-DIGIT BENIN\n1 Meteo")


def test_menus_prices_weather_and_unknown_number(settings, producer):
    settings.DEMO_MODE = True
    c = client_for()
    assert ussd(c, "0199999999", "2")[1].startswith("CON PRIX\n1 Mais")
    body = ussd(c, "0199999999", "2*1")[1]
    assert body.startswith("END PRIX MAIS (F/kg)\nBanikoara 190") and "(demonstration)" in body
    assert ussd(c, "0199999999", "1")[1].startswith("END METEO BENIN\nAuj ")
    # conseil, appuis et langue : numéro inconnu -> renvoi vers l'agent
    assert "agent ATDA" in ussd(c, "0199999999", "4")[1] and ussd(c, "0199999999", "4")[1].startswith("END")
    assert ussd(c, "0197000099", "9")[1] == "END Choix inconnu."
    # chaque écran tient en 182 caractères, sans accent
    for path in ["", "1", "2", "2*3", "4", "5", "3"]:
        more, text = handle("0197000099", path)
        assert len(text) <= MAX_CHARS and text.isascii(), (path, text)


def test_support_confirm_and_issue_by_ussd(settings, users, producer):
    from apps.production.models import Support

    settings.DEMO_MODE = True
    s1 = Support.objects.create(producer=producer, item="NPK", quantity=4, unit="sacs", value_xof=60000,
                                delivered_by=users["agent"])
    s2 = Support.objects.create(producer=producer, item="Uree", quantity=1, unit="sac", value_xof=15000,
                                delivered_by=users["agent"])
    c = client_for()
    menu = ussd(c, "0197000099", "4")[1]
    assert menu == "CON MES APPUIS\n1 4 sacs NPK\n2 1 sac Uree"  # le plus ancien d'abord
    assert "1 Je confirme\n2 Il en manque\n3 Rien recu" in ussd(c, "0197000099", "4*1")[1]
    assert ussd(c, "0197000099", "4*1*1")[1].startswith("END Merci, reception confirmee")
    s1.refresh_from_db()
    assert s1.status == "confirme"
    assert ussd(c, "0197000099", "4*1*3")[1].startswith("END Signalement enregistre")
    s2.refresh_from_db()
    assert s2.status == "remis"
    assert AuditLog.objects.filter(action="support.issue", object_id=str(s2.id), details__kind="rien_recu").exists()
    assert Notification.objects.filter(user=users["agent"], title="Appui signalé").exists()
    # l'appui signalé reste en attente : l'agent le règle avec le producteur
    assert ussd(c, "0197000099", "4")[1] == "CON MES APPUIS\n1 1 sac Uree"
    s2.status = "confirme"
    s2.save()
    assert ussd(c, "0197000099", "4")[1] == "END MES APPUIS\nAucun appui en attente de confirmation."


def test_language_and_advice(settings, producer):
    settings.DEMO_MODE = True
    c = client_for()
    assert ussd(c, "0197000099", "5*2")[1].startswith("END Langue enregistree : Fon.")
    producer.user.refresh_from_db()
    assert producer.user.language == "fon"
    assert ussd(c, "0197000099", "3")[1].startswith("CON CONSEIL")
    # aucune fiche publiée dans ce test : pas de réponse inventée
    assert "agent ATDA" in ussd(c, "0197000099", "3*Quand semer le mais ?")[1]


def test_sms_commands(settings, producer):
    settings.DEMO_MODE = True
    r = client_for().post("/api/v1/sms/inbound", {"sender": "+22901 97 00 00 99", "text": "prix maïs"}, format="json")
    assert r.status_code == 200 and r.json()["reply"].startswith("PRIX MAIS (F/kg)")
    sent = Outbox.objects.filter(to="0197000099").latest("created_at")
    assert sent.body == r.json()["reply"] and sent.encoding == "GSM-7" and sent.department == "alibori"
    assert client_for().post("/api/v1/sms/inbound", {"sender": "0197000099", "text": "bonjour"},
                             format="json").json()["reply"].startswith("AGRI-DIGIT : envoyez METEO")
    assert client_for().post("/api/v1/sms/inbound", {"sender": "0197000099", "text": "meteo"},
                             format="json").json()["reply"].startswith("METEO BANIKOARA")
