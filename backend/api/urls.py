from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import otp_views
from . import password_reset_views

router = DefaultRouter()
router.register(r'items', views.ItemViewSet, basename='item')

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
    path('users/create/', views.create_user_proxy, name='create-user'),
    path('users/', views.list_users_proxy, name='list-users'),
    path('users/<str:pk>/delete/', views.delete_user_proxy, name='delete-user'),
    path('users/<str:pk>/update/', views.update_user_proxy, name='update_user_proxy'),
    path('reset-password/', views.reset_password_proxy, name='reset_password_proxy'),
    path('login/', views.login_proxy, name='login_proxy'),
    
    # OTP-based password reset endpoints
    path('request-password-reset/', otp_views.request_password_reset, name='request-password-reset'),
    path('verify-otp/', otp_views.verify_otp, name='verify-otp'),
    path('reset-password-otp/', otp_views.reset_password_with_otp, name='reset-password-otp'),
    
    # Email-based password reset endpoints
    path('forgot-password/', password_reset_views.forgot_password, name='forgot-password'),
    path('reset-password-email/', password_reset_views.reset_password, name='reset-password-email'),

    path('apartments/', views.get_apartment_data, name='get_apartment_data'),
    path('ticket-options/', views.get_ticket_options, name='get_ticket_options'),
    path('maintenance-options/', views.get_maintenance_options, name='get_maintenance_options'),
    path('agents/', views.get_agents, name='get_agents'),
    path('tickets/create/', views.create_ticket, name='create_ticket'),
    path('tickets/', views.get_tickets, name='get_tickets'), # Endpoint for fetching tickets
    path('linked-records/', views.get_linked_records, name='get_linked_records'),
    path('update-guest-status/', views.update_guest_status, name='update_guest_status'),
    path('proxy-image/', views.proxy_image, name='proxy_image'),
    path('', include(router.urls)),
]
