import json

from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import FinanceProfile


@ensure_csrf_cookie
def index(request):
    return render(request, "index.html")


def logout_user(request):
    logout(request)

    response = redirect("/?logged_out=1")
    response.delete_cookie("sessionid", path="/")
    response.delete_cookie("csrftoken", path="/")

    return response


@login_required
@require_GET
def get_finance_data(request):
    profile, created = FinanceProfile.objects.get_or_create(user=request.user)

    has_data = bool(
        profile.display_name
        or profile.income
        or profile.expenses
        or profile.investments
    )

    return JsonResponse({
        "email": request.user.email or request.user.username,
        "name": profile.display_name,
        "income": float(profile.income),
        "expenses": profile.expenses,
        "investments": profile.investments,
        "active_page": profile.active_page,
        "has_data": has_data,
    })


@login_required
@require_POST
def save_finance_data(request):
    profile, created = FinanceProfile.objects.get_or_create(user=request.user)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

    profile.display_name = str(data.get("name") or "")[:80]
    profile.income = data.get("income") or 0

    expenses = data.get("expenses", [])
    investments = data.get("investments", [])

    profile.expenses = expenses if isinstance(expenses, list) else []
    profile.investments = investments if isinstance(investments, list) else []

    try:
        profile.active_page = int(data.get("active_page") or 1)
    except ValueError:
        profile.active_page = 1

    if profile.active_page not in [1, 2]:
        profile.active_page = 1

    profile.save()

    return JsonResponse({"ok": True})