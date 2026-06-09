import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


def home(request):
    return render(request, "index.html")


def get_json_data(request):
    try:
        if request.body:
            return json.loads(request.body)
        return {}
    except Exception:
        return {}


@csrf_exempt
def save_name(request):
    if request.method == "POST":
        data = get_json_data(request)
        name = data.get("name", "")

        return JsonResponse({
            "success": True,
            "message": "Name saved successfully",
            "name": name
        })

    return JsonResponse({
        "success": False,
        "error": "Only POST method allowed"
    }, status=405)


@csrf_exempt
def update_profile(request):
    if request.method == "POST":
        data = get_json_data(request)

        return JsonResponse({
            "success": True,
            "message": "Profile updated successfully",
            "data": data
        })

    return JsonResponse({
        "success": False,
        "error": "Only POST method allowed"
    }, status=405)


@csrf_exempt
def add_expense(request):
    if request.method == "POST":
        data = get_json_data(request)

        return JsonResponse({
            "success": True,
            "message": "Expense added successfully",
            "expense": data
        })

    return JsonResponse({
        "success": False,
        "error": "Only POST method allowed"
    }, status=405)


@csrf_exempt
def delete_expense(request, expense_id):
    if request.method in ["POST", "DELETE"]:
        return JsonResponse({
            "success": True,
            "message": "Expense deleted successfully",
            "expense_id": expense_id
        })

    return JsonResponse({
        "success": False,
        "error": "Only POST or DELETE method allowed"
    }, status=405)


@csrf_exempt
def add_investment(request):
    if request.method == "POST":
        data = get_json_data(request)

        return JsonResponse({
            "success": True,
            "message": "Investment added successfully",
            "investment": data
        })

    return JsonResponse({
        "success": False,
        "error": "Only POST method allowed"
    }, status=405)


@csrf_exempt
def delete_investment(request, investment_id):
    if request.method in ["POST", "DELETE"]:
        return JsonResponse({
            "success": True,
            "message": "Investment deleted successfully",
            "investment_id": investment_id
        })

    return JsonResponse({
        "success": False,
        "error": "Only POST or DELETE method allowed"
    }, status=405)