from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import logout
from django.shortcuts import redirect


def logout_view(request):
    logout(request)
    return redirect("/")


urlpatterns = [
    path("admin/", admin.site.urls),

    # Google login URLs
    path("auth/", include("social_django.urls", namespace="social")),

    # Logout URL
    path("logout/", logout_view, name="logout"),

    # Your app URLs
    path("", include("expenses.urls")),
]