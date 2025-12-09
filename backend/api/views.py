from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Item
from .serializers import ItemSerializer


class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing items.
    Provides CRUD operations (Create, Read, Update, Delete).
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint."""
    return Response({
        'status': 'ok',
        'message': 'API is running successfully!'
    })
