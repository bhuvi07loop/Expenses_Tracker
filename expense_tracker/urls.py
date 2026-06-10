from django.contrib import admin
from django.urls import path, include
from expenses.views import index, logout_user

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", index, name="home"),
    path("auth/", include("social_django.urls", namespace="social")),
    path("logout/", logout_user, name="logout"),
]