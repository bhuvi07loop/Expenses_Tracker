from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),

    path('logout/', views.logout_user, name='logout'),

    path('api/save-name/', views.save_name, name='save_name'),
    path('api/update-profile/', views.update_profile, name='update_profile'),

    path('api/add-expense/', views.add_expense, name='add_expense'),
    path('api/delete-expense/<int:expense_id>/', views.delete_expense, name='delete_expense'),

    path('api/add-investment/', views.add_investment, name='add_investment'),
    path('api/delete-investment/<int:investment_id>/', views.delete_investment, name='delete_investment'),
]