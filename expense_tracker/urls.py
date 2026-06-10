from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import logout
from django.shortcuts import redirect


def logout_view(request):
    logout(request)
    response = redirect("/")
    response.delete_cookie("sessionid", path="/")
    response.delete_cookie("csrftoken", path="/")
    return response


urlpatterns = [
    path("admin/", admin.site.urls),

    # Google login URL:
    # /auth/login/google-oauth2/
    # /auth/complete/google-oauth2/
    path("auth/", include("social_django.urls", namespace="social")),

    # Logout
    path("logout/", logout_view, name="logout"),

    # Main app
    path("", include("expenses.urls")),
]