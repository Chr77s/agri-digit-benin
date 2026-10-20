from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts import api as acc
from apps.alerts import api as alerts
from apps.assistant import api as assistant
from apps.audit import api as audit
from apps.cooperatives import api as coop
from apps.cooperatives import organisations as orgs
from apps.credit import api as credit
from apps.dashboard import api as dashboard
from apps.diagnosis import api as diag
from apps.exports import api as exports
from apps.farms import api as farms
from apps.interop import api as interop
from apps.knowledge import api as kn
from apps.knowledge import publications as pubs
from apps.lands import api as lands
from apps.market import api as market
from apps.parcels import api as parcels
from apps.producers import api as prod
from apps.production import api as prodn
from apps.production import lots_api, recovery_api, revenue
from apps.programs import api as prog
from apps.referentiel import api as ref
from apps.satellite import api as sat
from apps.translations import api as trans
from apps.translations import corpus
from apps.ussd import api as ussd

v1 = [
    path("auth/otp/request", acc.otp_request),
    path("auth/otp/verify", acc.otp_verify),
    path("auth/refresh", acc.refresh),
    path("auth/logout", acc.logout),
    path("auth/me", acc.me),
    path("auth/phone-change/request", acc.phone_change_request),
    path("auth/phone-change/confirm", acc.phone_change_confirm),
    path("demo/otp-inbox", acc.otp_inbox),
    path("admin/users", acc.admin_users),
    path("admin/users/<uuid:pk>", acc.admin_user_detail),
    path("audit-logs", audit.AuditLogList.as_view()),
    path("audit-logs/verify", audit.verify),
    path("ref/value-chains", ref.value_chains),
    path("ref/departments", ref.departments),
    path("producers/register", prod.register),
    path("producers", prod.producer_list),
    path("producers/<uuid:pk>", prod.producer_detail),
    path("producers/<uuid:pk>/validate", prod.producer_validate),
    path("producers/<uuid:pk>/reject", prod.producer_reject),
    path("producers/<uuid:pk>/versions", prod.producer_versions),
    path("consents/mine", prod.consents_mine),
    path("consents/<uuid:pk>/withdraw", prod.consent_withdraw),
    path("parcels", parcels.parcel_list),
    path("parcels/<uuid:pk>", parcels.parcel_detail),
    path("campaigns", parcels.campaign_list),
    path("campaigns/<uuid:pk>", parcels.campaign_detail),
    path("assistant/ask", assistant.ask),
    path("knowledge", kn.doc_list),
    path("knowledge/<uuid:pk>", kn.doc_detail),
    path("knowledge/<uuid:pk>/review", kn.doc_review),
    path("knowledge/<uuid:pk>/publish", kn.doc_publish),
    path("knowledge/<uuid:pk>/versions", kn.doc_versions),
    path("alerts", alerts.alert_list),
    path("alerts/<uuid:pk>/approve", alerts.alert_approve),
    path("alerts/<uuid:pk>/send", alerts.alert_send),
    path("notifications", alerts.notification_list),
    path("notifications/<uuid:pk>/read", alerts.notification_read),
    path("chat", alerts.chat_mine),
    path("chat/threads", alerts.chat_threads),
    path("chat/<uuid:producer_id>", alerts.chat_thread),
    path("outbox", alerts.outbox_list),
    path("ussd/gateway", ussd.ussd_gateway),
    path("sms/inbound", ussd.sms_inbound),
    path("programs", prog.program_list),
    path("programs/estimate", prog.program_estimate),
    path("programs/<uuid:pk>", prog.program_detail),
    path("programs/<uuid:pk>/apply", prog.program_apply),
    path("applications", prog.application_list),
    path("applications/<uuid:pk>/decide", prog.application_decide),
    path("applications/<uuid:pk>/contest", prog.application_contest),
    path("selection-runs", prog.run_list),
    path("selection-runs/<uuid:pk>/candidates", prog.run_candidates),
    path("selection-runs/<uuid:pk>/validate", prog.run_validate),
    path("selection-runs/<uuid:pk>/contest", prog.run_contests),
    path("selection-runs/<uuid:pk>/contests", prog.run_contests),
    path("producers/<uuid:pk>/card", prod.producer_card),
    path("verify/<str:code>", prod.verify),
    path("contests/mine", prog.contests_mine),
    path("contests/<uuid:pk>/decide", prog.contest_decide),
    path("cooperatives", coop.cooperative_list),
    path("cooperatives/<uuid:pk>", coop.cooperative_detail),
    path("cooperatives/<uuid:pk>/members", coop.cooperative_members),
    path("cooperatives/nearby", coop.cooperatives_nearby),
    path("cooperatives/<uuid:pk>/join-request", coop.cooperative_join_request),
    path("join-requests", coop.join_request_list),
    path("join-requests/<uuid:pk>/decide", coop.join_request_decide),
    path("memberships/mine", coop.memberships_mine),
    path("memberships/<uuid:pk>/end", coop.membership_end),
    path("supports", prodn.support_list),
    path("supports/<uuid:pk>/confirm", prodn.support_confirm),
    path("supports/<uuid:pk>/report", prodn.support_report),
    path("harvests/<uuid:pk>/check", prodn.harvest_check),
    path("harvests", prodn.harvest_list),
    path("schemes", lands.scheme_list),
    path("schemes/<uuid:pk>", lands.scheme_detail),
    path("schemes/<uuid:pk>/works", lands.scheme_works),
    path("works/<uuid:pk>", lands.works_detail),
    path("soil-analyses", lands.soil_list),
    path("soil-analyses/summary", lands.soil_summary),
    path("land-use", lands.land_use),
    path("climate-risks", lands.climate_risks),
    path("climate-risks/departments", lands.climate_departments),
    path("claims", recovery_api.claim_list),
    path("claims/portfolio", recovery_api.claim_portfolio),
    path("claims/<uuid:pk>", recovery_api.claim_detail),
    path("claims/<uuid:pk>/pay", recovery_api.claim_pay),
    path("claim-payments/<uuid:pk>", recovery_api.claim_payment_detail),
    path("expenses", revenue.expense_list),
    path("expenses/<uuid:pk>", revenue.expense_delete),
    path("revenue", revenue.revenue_summary),
    path("organisations", orgs.organisation_list),
    path("organisations/<uuid:pk>", orgs.organisation_detail),
    path("organisations/<uuid:pk>/cooperatives", orgs.organisation_add_cooperative),
    path("organisations/<uuid:pk>/events", orgs.organisation_event),
    path("publications", pubs.publication_list),
    path("publications/<uuid:pk>/archive", pubs.publication_archive),
    path("dashboard/financing", pubs.financing),
    path("corpus", corpus.corpus_list),
    path("corpus/stats", corpus.corpus_stats),
    path("corpus/<uuid:pk>/answer", corpus.corpus_answer),
    path("corpus/<uuid:pk>/validate", corpus.corpus_validate),
    path("sites", lots_api.site_list),
    path("lots", lots_api.lot_list),
    path("lots/collect", lots_api.lot_collect),
    path("lots/transform", lots_api.lot_transform),
    path("lots/<uuid:pk>/transfer", lots_api.lot_transfer),
    path("lots/<str:ref>/trace", lots_api.lot_trace),
    path("diagnoses", diag.diagnosis_list),
    path("diagnoses/<uuid:pk>/review", diag.diagnosis_review),
    path("diagnoses/<uuid:pk>/ask-agronome", diag.diagnosis_ask_agronome),
    path("diagnoses/<uuid:pk>/image", diag.diagnosis_image),
    path("translations", trans.entry_list),
    path("translations/summary", trans.entry_summary),
    path("translations/<uuid:pk>", trans.entry_detail),
    path("translations/<uuid:pk>/review", trans.entry_review),
    path("i18n/<str:language>.json", trans.i18n_dictionary),
    path("offers", market.offer_list),
    path("offers/<uuid:pk>/contact", market.offer_contact),
    path("offers/<uuid:pk>/status", market.offer_status),
    path("matches/mine", market.matches_mine),
    path("matches/<uuid:pk>/accept", market.match_accept),
    path("matches/<uuid:pk>/refuse", market.match_refuse),
    path("payments", market.payment_create),
    path("payments/<uuid:pk>", market.payment_detail),
    path("payments/<uuid:pk>/refund", market.payment_refund),
    path("satellite", sat.satellite),
    path("weather", sat.weather),
    path("interop/connectors", interop.connectors),
    path("interop/exchanges", interop.exchanges),
    path("interop/keys/<str:partner>/renew", interop.key_renew),
    path("interop/keys/<str:partner>/revoke", interop.key_revoke),
    path("interop/<str:partner>/aggregates", interop.aggregates),
    path("dashboard/sea", dashboard.sea),
    path("farms/aggregates", farms.farm_aggregates),
    path("farms", farms.farm_list),
    path("dashboard", dashboard.dashboard),
    path("exports", exports.export),
    path("credit/consent", credit.consent),
    path("credit/consent/withdraw", credit.consent_withdraw),
    path("credit/consented-producers", credit.consented_producers),
    path("credit/scores/<uuid:producer_id>", credit.score),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
] + [path(f"api/v1/{p.pattern}", p.callback) for p in v1]
