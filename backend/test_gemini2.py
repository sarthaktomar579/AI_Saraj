import asyncio
import os
import logging
logging.basicConfig(level=logging.ERROR)
from dotenv import load_dotenv
load_dotenv()
from services.gemini_client import gemini_client
async def main():
    res = await gemini_client.generate_json('Respond with a JSON object containing key test and value value')
    print(res)
asyncio.run(main())
