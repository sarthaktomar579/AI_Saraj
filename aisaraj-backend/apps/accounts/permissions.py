"""Role-based permission classes."""
from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'


class IsInterviewer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('interviewer', 'admin')


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsInterviewParticipant(BasePermission):
    """Object-level: user must be either the interviewer or student."""
    def has_object_permission(self, request, view, obj):
        return request.user in (obj.interviewer, obj.student)
