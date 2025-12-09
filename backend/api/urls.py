from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ItemViewSet, health_check

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('', include(router.urls)),
]
