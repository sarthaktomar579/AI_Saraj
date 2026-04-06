"""Account serializers."""
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'first_name', 'last_name']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name',
                  'avatar_url', 'phone', 'is_verified', 'date_joined', 'updated_at']
        read_only_fields = ['id', 'date_joined', 'updated_at', 'is_verified']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Lightweight serializer for nested references."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role']
