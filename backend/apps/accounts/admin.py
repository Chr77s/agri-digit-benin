from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["phone", "full_name", "role", "department", "is_active"]
    exclude = ["otp_hash", "password"]
