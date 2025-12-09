from django.contrib import admin
from .models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    """Admin configuration for Item model."""
    list_display = ['id', 'title', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
