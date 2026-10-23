import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

ROLES = [
    "producteur", "agent_atda", "gestionnaire_cooperative", "transformateur", "distributeur", "agent_financier",
    "agronome_inrab", "repr_mtdi", "responsable_programme", "admin_maep", "auditeur_copil",
]


class UserManager(BaseUserManager):
    def create_user(self, phone, password=None, **extra):
        user = self.model(phone=phone, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def create_superuser(self, phone, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role="admin_maep")
        return self.create_user(phone, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=10, unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=40, choices=[(r, r) for r in ROLES], default="producteur", db_index=True)
    department = models.CharField(max_length=40, blank=True, db_index=True)
    commune = models.CharField(max_length=40, blank=True)
    language = models.CharField(max_length=5, default="fr")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    # code à usage unique : seul le hachage est stocké
    otp_hash = models.CharField(max_length=128, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    otp_failures = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    # changement de numéro en cours : le code est haché avec ce numéro (inutilisable pour se connecter)
    pending_phone = models.CharField(max_length=10, blank=True)

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []
    objects = UserManager()

    @property
    def requires_password(self):
        return self.role != "producteur"

    def __str__(self):
        return self.phone
