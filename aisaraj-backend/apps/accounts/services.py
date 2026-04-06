"""Auth service layer."""
from django.contrib.auth import get_user_model

User = get_user_model()


class AuthService:
    @staticmethod
    def register_user(data: dict) -> 'User':
        return User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', 'student'),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
        )
