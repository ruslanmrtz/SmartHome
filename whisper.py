import torch
import torchaudio
from transformers import AutoProcessor, WhisperForConditionalGeneration
from fastapi import UploadFile
from io import BytesIO
import tempfile
from pathlib import Path

# Загрузка модели и процессора
processor = AutoProcessor.from_pretrained("openai/whisper-large-v3-turbo")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3-turbo")


async def get_text_from_audio(file: UploadFile):
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        audio_path = tmp.name


    # Загрузка и декодирование MP3 в waveform
    waveform, sample_rate = torchaudio.load(audio_path)

    # Если у аудио больше одного канала (например, стерео), преобразуем в моно
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)

    # Ресэмплинг на 16000 Гц, если необходимо
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
        waveform = resampler(waveform)

    # Преобразование в массив (numpy) и передача в процессор
    audio_array = waveform.squeeze().numpy()

    # Подготовка входных данных
    inputs = processor(audio_array, return_tensors="pt", sampling_rate=16000)
    input_features = inputs.input_features

    # Генерация транскрипции
    generated_ids = model.generate(inputs=input_features)

    # Декодирование результата
    transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return transcription