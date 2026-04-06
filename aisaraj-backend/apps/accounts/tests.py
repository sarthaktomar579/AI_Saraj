"""Test cases for accounts app."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/v1/auth/register/'
        self.login_url = '/api/v1/auth/login/'
        self.profile_url = '/api/v1/auth/me/'

    def test_register_student(self):
        payload = {
            'username': 'teststudent',
            'email': 'student@test.com',
            'password': 'testpass123',
            'role': 'student',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.first().role, 'student')

    def test_register_interviewer(self):
        payload = {
            'username': 'testinterviewer',
            'email': 'interviewer@test.com',
            'password': 'testpass123',
            'role': 'interviewer',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.first().role, 'interviewer')

    def test_login(self):
        User.objects.create_user(
            username='loginuser', email='login@test.com',
            password='testpass123', role='student',
        )
        response = self.client.post(self.login_url, {
            'username': 'loginuser', 'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        user = User.objects.create_user(
            username='profileuser', email='profile@test.com',
            password='testpass123', role='student',
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profileuser')
        self.assertEqual(response.data['role'], 'student')


class PermissionTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='student', password='pass123', role='student',
        )
        self.interviewer = User.objects.create_user(
            username='interviewer', password='pass123', role='interviewer',
        )
        self.admin = User.objects.create_user(
            username='admin', password='pass123', role='admin',
        )
        self.client = APIClient()

    def test_student_cannot_create_interview(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/v1/interviews/', {
            'student': self.student.id,
            'title': 'Test',
            'scheduled_at': '2026-03-01T10:00:00Z',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_interviewer_can_create_interview(self):
        self.client.force_authenticate(user=self.interviewer)
        response = self.client.post('/api/v1/interviews/', {
            'student': self.student.id,
            'title': 'Test Interview',
            'scheduled_at': '2026-03-01T10:00:00Z',
        })
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])
