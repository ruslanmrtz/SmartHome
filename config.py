from dotenv import load_dotenv
import os

load_dotenv()  # take environment variables

open_weather_key = os.getenv('OPEN_WEATHER_KEY')
