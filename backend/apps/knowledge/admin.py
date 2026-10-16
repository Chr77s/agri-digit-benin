from django.contrib import admin

from .models import KnowledgeDoc


@admin.register(KnowledgeDoc)
class KnowledgeDocAdmin(admin.ModelAdmin):
    list_display = ["title", "value_chain", "status", "version", "updated_at"]
    list_filter = ["value_chain", "status"]
    search_fields = ["title", "body"]
