from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    session_key = models.CharField(max_length=100, unique=True, null=True, blank=True)
    name = models.CharField(max_length=100, blank=True, default="")
    total_investment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        if self.user:
            return self.user.email or self.user.username
        return self.name or str(self.session_key)


class Expense(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="expenses")
    title = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return self.title


class Investment(models.Model):
    INVESTMENT_TYPES = [
        ("Stock", "Stock"),
        ("Gold", "Gold"),
        ("Mutual Funds", "Mutual Funds"),
        ("FD", "FD"),
        ("RD", "RD"),
        ("Real Estate", "Real Estate"),
        ("Crypto", "Crypto"),
        ("Other", "Other"),
    ]

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="investments")
    inv_type = models.CharField(max_length=50, choices=INVESTMENT_TYPES, default="Stock")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    return_rate = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    note = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.inv_type