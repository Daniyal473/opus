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
    
    path('', include(router.urls)),
]
