import requests

# URL вашего FastAPI сервера
url = "http://127.0.0.1:8000/transcribe/"

# Путь к вашему аудиофайлу
audio_file_path = "story.mp3"

with open(audio_file_path, "rb") as f:
    files = {"file": (audio_file_path, f, "audio/mpeg")}
    print(f"📤 Отправляю файл {audio_file_path} на {url}...")

    response = requests.post(url, files=files)


print(response.json())