from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from users import views

app_name = "users"

urlpatterns = [
    # crud user
    path("user/", views.UserView.as_view(), name="user"),
    # email
    path(
        "user/resend-email-confirmation/",
        views.resend_confirmation_email,
        name="resend-email-confirmation",
    ),
    path("user/confirm-email/", views.confirm_email, name="confirm_email"),
    # token - login tradicional (apenas para admins)
    path("token/", views.login, name="token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("token/revoke/", views.logout, name="revoke"),
    # login com código (para usuários normais)
    path("login/request-code/", views.request_login_code, name="request_login_code"),
    path("login/verify-code/", views.login_with_code, name="login_with_code")
]
