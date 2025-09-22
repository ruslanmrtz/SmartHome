from transformers import pipeline
import numpy as np

classifier = pipeline("zero-shot-classification", model="MoritzLaurer/mDeBERTa-v3-base-mnli-xnli")
candidate_labels = ["шторы", "свет", "телевизор", "часы", 'утро', 'вечер', 'погода']


async def classify_text(text: str) -> str:
    output = classifier(text, candidate_labels, multi_label=False)

    result = output['labels'][np.argmax(output['scores'])]

    return result
