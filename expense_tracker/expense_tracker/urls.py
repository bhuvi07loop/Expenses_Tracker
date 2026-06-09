from django.contrib import admin
from django.urls import path, include
from expenses import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.home, name="home"),
    path("logout/", views.logout_user, name="logout"),
    path("auth/", include("social_django.urls", namespace="social")),
]