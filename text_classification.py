from transformers import pipeline
import numpy as np

import logging

classifier = pipeline("zero-shot-classification", model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli")
candidate_labels = ["шторы", "свет", "телевизор", "часы", 'утро', 'вечер', 'погода']

async def classify_text(text: str) -> str:
    output = classifier(text, candidate_labels, multi_label=False)

    logging.error(output)

    max_score_index = np.argmax(output['scores'])
    max_score = output['scores'][max_score_index]

    if max_score <= 0.5:
        return "Не найден"

    result = output['labels'][max_score_index]
    return result
