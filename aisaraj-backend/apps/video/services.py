"""VideoService facade — swap providers via settings.VIDEO_PROVIDER."""
from django.conf import settings
from apps.video.interfaces import VideoProvider
from apps.video.providers.getstream import GetStreamProvider

_PROVIDERS = {
    'getstream': GetStreamProvider,
}


class VideoService:
    def __init__(self):
        provider_name = getattr(settings, 'VIDEO_PROVIDER', 'getstream')
        provider_cls = _PROVIDERS.get(provider_name)
        if not provider_cls:
            raise ValueError(f'Unknown video provider: {provider_name}')
        self._provider: VideoProvider = provider_cls()

    def create_call(self, call_id, participants):
        return self._provider.create_call(call_id, participants)

    def get_token(self, user_id, call_id):
        return self._provider.generate_user_token(user_id, call_id)

    def end_call(self, call_id):
        return self._provider.end_call(call_id)

    def get_recording(self, call_id):
        return self._provider.get_recording_url(call_id)
