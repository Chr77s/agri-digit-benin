from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts import api as acc
from apps.alerts import api as alerts
from apps.assistant import api as assistant
from apps.audit import api as audit
from apps.dashboard import api as dashboard
from apps.exports import api as exports
from apps.farms import api as farms
from apps.knowledge import api as kn
from apps.parcels import api as parcels
from apps.producers import api as prod
from apps.programs import api as prog
from apps.referentiel import api as ref

v1 = [
    path("auth/otp/request", acc.otp_request),
    path("auth/otp/verify", acc.otp_verify),
    path("auth/refresh", acc.refresh),
    path("auth/logout", acc.logout),
    path("auth/me", acc.me),
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
    path("farms/aggregates", farms.farm_aggregates),
    path("farms", farms.farm_list),
    path("dashboard", dashboard.dashboard),
    path("exports", exports.export),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
] + [path(f"api/v1/{p.pattern}", p.callback) for p in v1]
