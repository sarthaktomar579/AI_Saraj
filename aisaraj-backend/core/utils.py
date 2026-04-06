"""Shared utility functions."""


def truncate(text: str, max_length: int = 10000) -> str:
    """Truncate text to max_length."""
    if len(text) <= max_length:
        return text
    return text[:max_length] + '...[truncated]'
