"""Resume parsing service — extract text from uploaded PDF resumes."""
import logging
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)


def extract_resume_text(file_obj) -> str:
    """Extract all text content from a PDF resume."""
    try:
        reader = PdfReader(file_obj)
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        full_text = '\n'.join(pages)
        logger.info('Extracted %d characters from resume (%d pages)', len(full_text), len(reader.pages))
        return full_text
    except Exception as e:
        logger.error('Failed to parse resume PDF: %s', e)
        return ''
