import requests

from config import open_weather_key


def get_weather(city_id: int = 1490624) -> dict:

    try:
        res = requests.get("http://api.openweathermap.org/data/2.5/weather",
                     params={'id': city_id, 'units': 'metric', 'lang': 'ru', 'APPID': open_weather_key})
        data = res.json()

        return {'conditions': data['weather'][0]['description'],
                'temp': data['main']['temp'],}

    except Exception as e:
        print("Exception (weather):", e)


print(get_weather())