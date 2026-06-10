from django.shortcuts import render, redirect
from django.contrib.auth import logout


def index(request):
    return render(request, "index.html")


def logout_user(request):
    logout(request)

    response = redirect("/?logged_out=1")
    response.delete_cookie("sessionid", path="/")
    response.delete_cookie("csrftoken", path="/")

    return response