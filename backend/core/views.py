from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse

# Import necessário para documentar views manuais
from drf_spectacular.utils import extend_schema, OpenApiTypes

@extend_schema(
    summary="Navegação da API (Root)",
    description="Lista todos os endpoints e recursos disponíveis no sistema.",
    tags=["Core"],
    responses={
        200: OpenApiTypes.OBJECT
    },
    # auth=[], 
)
@api_view(['GET'])
def api_root(request, format=None):
    """
    API Root - Lista todos os endpoints disponíveis
    """
    return Response({
        'users': {
            'user': reverse('users:user', request=request, format=format),
            'resend-email-confirmation': reverse('users:resend-email-confirmation', request=request, format=format),
            'confirm-email': reverse('users:confirm_email', request=request, format=format),
            'password-reset': reverse('users:password_reset_request', request=request, format=format),
            'password-reset-confirm': reverse('users:password_reset_confirm', request=request, format=format),
        },
        'auth': {
            'login-admin': reverse('users:token', request=request, format=format),
            'login-request-code': reverse('users:request_login_code', request=request, format=format),
            'login-verify-code': reverse('users:login_with_code', request=request, format=format),
            'token-refresh': reverse('users:refresh', request=request, format=format),
            'logout': reverse('users:revoke', request=request, format=format),
        },
        'documentation': {
            'schema': reverse('schema', request=request, format=format),
            'swagger-ui': reverse('swagger-ui', request=request, format=format),
            'redoc': reverse('redoc', request=request, format=format),
        },
    })