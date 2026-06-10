import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("VERCEL_URL"))


# SECURITY
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-local-key")
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = ["*"]


# APPS
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "social_django",
    "expenses",
]


# MIDDLEWARE
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "expense_tracker.urls"


# TEMPLATES
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",

                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]


WSGI_APPLICATION = "expense_tracker.wsgi.application"


# DATABASE
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=DATABASE_URL.startswith(("postgres://", "postgresql://")),
        )
    }
else:
    if IS_VERCEL:
        raise ImproperlyConfigured("DATABASE_URL missing in Vercel Environment Variables")

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# LANGUAGE / TIME
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True


# STATIC FILES
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# AUTHENTICATION
AUTHENTICATION_BACKENDS = (
    "social_core.backends.google.GoogleOAuth2",
    "django.contrib.auth.backends.ModelBackend",
)

LOGIN_URL = "/auth/login/google-oauth2/"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"


# GOOGLE OAUTH
# This supports BOTH names:
# 1. SOCIAL_AUTH_GOOGLE_OAUTH2_KEY
# 2. GOOGLE_CLIENT_ID
GOOGLE_CLIENT_ID = (
    os.environ.get("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
    or os.environ.get("GOOGLE_CLIENT_ID")
)

GOOGLE_CLIENT_SECRET = (
    os.environ.get("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET")
    or os.environ.get("GOOGLE_CLIENT_SECRET")
)

if not GOOGLE_CLIENT_ID:
    raise ImproperlyConfigured("Google Client ID missing. Add SOCIAL_AUTH_GOOGLE_OAUTH2_KEY in .env or Vercel.")

if not GOOGLE_CLIENT_SECRET:
    raise ImproperlyConfigured("Google Client Secret missing. Add SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET in .env or Vercel.")


SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = GOOGLE_CLIENT_ID
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = GOOGLE_CLIENT_SECRET

SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ["email", "profile"]

SOCIAL_AUTH_GOOGLE_OAUTH2_AUTH_EXTRA_ARGUMENTS = {
    "prompt": "select_account"
}


# HTTPS / PROXY
USE_X_FORWARDED_HOST = IS_VERCEL

if IS_VERCEL:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


# GOOGLE REDIRECT FIX
PRODUCTION_DOMAIN = os.environ.get(
    "PRODUCTION_DOMAIN",
    "expenses-tracker-one-gray.vercel.app"
)

if IS_VERCEL:
    SOCIAL_AUTH_REDIRECT_IS_HTTPS = True
    SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = (
        f"https://{PRODUCTION_DOMAIN}/auth/complete/google-oauth2/"
    )
else:
    SOCIAL_AUTH_REDIRECT_IS_HTTPS = False


# SESSION / COOKIE
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

SESSION_COOKIE_SECURE = IS_VERCEL
SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SECURE = IS_VERCEL

CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://expenses-tracker-one-gray.vercel.app",
    "https://*.vercel.app",
]


# SOCIAL AUTH PIPELINE
SOCIAL_AUTH_PIPELINE = (
    "social_core.pipeline.social_auth.social_details",
    "social_core.pipeline.social_auth.social_uid",
    "social_core.pipeline.social_auth.auth_allowed",
    "social_core.pipeline.social_auth.social_user",
    "social_core.pipeline.user.get_username",
    "social_core.pipeline.user.create_user",
    "social_core.pipeline.social_auth.associate_user",
    "social_core.pipeline.social_auth.load_extra_data",
    "social_core.pipeline.user.user_details",
)