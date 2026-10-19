from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts import api as acc
from apps.alerts import api as alerts
from apps.assistant import api as assistant
from apps.audit import api as audit
from apps.cooperatives import api as coop
from apps.credit import api as credit
from apps.dashboard import api as dashboard
from apps.diagnosis import api as diag
from apps.exports import api as exports
from apps.farms import api as farms
from apps.interop import api as interop
from apps.knowledge import api as kn
from apps.market import api as market
from apps.parcels import api as parcels
from apps.producers import api as prod
from apps.production import api as prodn
from apps.programs import api as prog
from apps.referentiel import api as ref
from apps.satellite import api as sat
from apps.translations import api as trans

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
    path("outbox", alerts.outbox_list),
    path("programs", prog.program_list),
    path("programs/<uuid:pk>/apply", prog.program_apply),
    path("applications", prog.application_list),
    path("applications/<uuid:pk>/decide", prog.application_decide),
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
    path("memberships/mine", coop.memberships_mine),
    path("memberships/<uuid:pk>/end", coop.membership_end),
    path("supports", prodn.support_list),
    path("supports/<uuid:pk>/confirm", prodn.support_confirm),
    path("harvests", prodn.harvest_list),
    path("diagnoses", diag.diagnosis_list),
    path("diagnoses/<uuid:pk>/review", diag.diagnosis_review),
    path("diagnoses/<uuid:pk>/image", diag.diagnosis_image),
    path("translations", trans.entry_list),
    path("translations/summary", trans.entry_summary),
    path("translations/<uuid:pk>", trans.entry_detail),
    path("translations/<uuid:pk>/review", trans.entry_review),
    path("i18n/<str:language>.json", trans.i18n_dictionary),
    path("offers", market.offer_list),
    path("offers/<uuid:pk>/contact", market.offer_contact),
    path("matches/mine", market.matches_mine),
    path("matches/<uuid:pk>/accept", market.match_accept),
    path("matches/<uuid:pk>/refuse", market.match_refuse),
    path("payments", market.payment_create),
    path("payments/<uuid:pk>", market.payment_detail),
    path("payments/<uuid:pk>/refund", market.payment_refund),
    path("satellite", sat.satellite),
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
