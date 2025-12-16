from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'items', views.ItemViewSet, basename='item')

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
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
