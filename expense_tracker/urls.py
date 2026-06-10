from django.contrib import admin
from django.urls import path, include
from expenses.views import index, logout_user, get_finance_data, save_finance_data

urlpatterns = [
    path("admin/", admin.site.urls),

    path("", index, name="home"),

    path("auth/", include("social_django.urls", namespace="social")),

    path("logout/", logout_user, name="logout"),

    path("api/finance/", get_finance_data, name="get_finance_data"),
    path("api/finance/save/", save_finance_data, name="save_finance_data"),
]