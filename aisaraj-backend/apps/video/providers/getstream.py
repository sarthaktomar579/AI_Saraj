"""GetStream Video provider implementation."""
import logging
from django.conf import settings
from apps.video.interfaces import VideoProvider, VideoCallInfo

logger = logging.getLogger(__name__)


class GetStreamProvider(VideoProvider):
    def __init__(self):
        try:
            from stream_video import StreamVideoClient
            self.client = StreamVideoClient(
                api_key=settings.GETSTREAM_API_KEY,
                api_secret=settings.GETSTREAM_API_SECRET,
            )
        except ImportError:
            logger.warning('stream_video SDK not installed. Video calls will not work.')
            self.client = None

    def create_call(self, call_id, participants):
        if not self.client:
            return VideoCallInfo(call_id=call_id, provider='getstream')
        call = self.client.video.call('default', call_id)
        call.create(data={
            'members': [{'user_id': uid} for uid in participants],
        })
        return VideoCallInfo(call_id=call_id, provider='getstream')

    def generate_user_token(self, user_id, call_id):
        if not self.client:
            return ''
        return self.client.create_token(user_id)

    def end_call(self, call_id):
        if not self.client:
            return
        call = self.client.video.call('default', call_id)
        call.end()

    def get_recording_url(self, call_id):
        if not self.client:
            return None
        call = self.client.video.call('default', call_id)
        recordings = call.list_recordings()
        return recordings[0].url if recordings else None
