from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import logout
from django.shortcuts import redirect


def logout_view(request):
    logout(request)

    response = redirect("/?logout=1")
    response.delete_cookie("sessionid", path="/")
    response.delete_cookie("csrftoken", path="/")
    return response


urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/", include("social_django.urls", namespace="social")),
    path("logout/", logout_view, name="logout"),
    path("", include("expenses.urls")),
]
def logout_view(request):
    logout(request)

    response = redirect("/?logged_out=1")
    response.delete_cookie("sessionid", path="/")
    response.delete_cookie("csrftoken", path="/")
    return response