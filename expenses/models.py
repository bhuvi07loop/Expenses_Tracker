from django.db import models
from django.contrib.auth.models import User


class FinanceProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="finance_profile"
    )

    display_name = models.CharField(max_length=80, blank=True)
    income = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    expenses = models.JSONField(default=list, blank=True)
    investments = models.JSONField(default=list, blank=True)

    active_page = models.PositiveSmallIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.email or self.user.username