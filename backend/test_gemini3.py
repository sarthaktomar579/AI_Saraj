import asyncio
import os
import logging
logging.basicConfig(level=logging.ERROR)
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-3.7-flash')
async def main():
    res = await model.generate_content_async('Respond with a JSON object containing key test and value value')
    print('SUCCESS:', res.text)
asyncio.run(main())
