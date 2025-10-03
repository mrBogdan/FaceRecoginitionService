from deepface import DeepFace

from sklearn.metrics import accuracy_score, roc_auc_score, roc_curve
from sklearn.metrics.pairwise import cosine_similarity
import tensorflow_datasets as tfds
import random
import sys
import numpy as np
from collections import defaultdict
from memory_profiler import memory_usage
import matplotlib.pyplot as plt
import time
import tracemalloc

def calcTime(func):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"⏱ {func.__name__} виконалась за {end - start:.4f} сек")
        return result
    return wrapper


print("sys.prefix:", sys.prefix)
print("base_prefix:", sys.base_prefix)
print("Is venv active?", sys.prefix != sys.base_prefix)

if sys.prefix == sys.base_prefix:
    exit("Should be run with venv")

pairs = []

lfw = tfds.load("lfw", split="train", as_supervised=True, shuffle_files=True)
lfw_list = list(tfds.as_numpy(lfw))

label_to_imgs = defaultdict(list)

for label, img in lfw_list:
    label_to_imgs[label].append(img)


def get_positive_pair():
    while True:
        label, imgs = random.choice(list(label_to_imgs.items()))
        if len(imgs) >= 2:
            return random.sample(imgs, 2), label
    
 
def get_negative_pair():
    label1, imgs1 = random.choice(list(label_to_imgs.items()))
    label2, imgs2 = random.choice(list(label_to_imgs.items()))
    while label1 == label2:
        label2, imgs2 = random.choice(list(label_to_imgs.items()))
    return random.choice(imgs1), random.choice(imgs2), (label1, label2)

@calcTime
def generate_pairs(n=10):
    positive_pairs = []
    negative_pairs = []
    for _ in range(n):
        pos_pair, label = get_positive_pair()
        positive_pairs.append((pos_pair[0], pos_pair[1], True))
        neg_img1, neg_img2, labels = get_negative_pair()
        negative_pairs.append((neg_img1, neg_img2, False))
    return positive_pairs + negative_pairs

def test_model(model, pairs):
    results = {}

    y_true = []
    y_pred_labels = []
    y_scores = []

    total_time = 0
    peak_mem = 0

    for img1, img2, is_same in pairs:
        start_time = time.time()
        tracemalloc.start()

        try:
            result = DeepFace.verify(img1_path=img1, img2_path=img2, model_name=model, enforce_detection=False)
            pred_same = result["verified"]
            distance = result["distance"]

            score = -distance

            y_true.append(1 if is_same else 0)
            y_pred_labels.append(1 if pred_same else 0)
            y_scores.append(score)
            
        except Exception as e:
            print(f"Помилка для {model}: {e}")

        
        end_time = time.time()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        total_time += end_time - start_time
        peak_mem = max(peak_mem, peak)

    acc = accuracy_score(y_true, y_pred_labels)
    try:
        auc = roc_auc_score(y_true, y_scores)
    except ValueError:
        auc = None
    results[model] = {"accuracy": acc, "auc": auc}

    fpr, tpr, _ = roc_curve(y_true, y_scores)
    plt.plot(fpr, tpr, label=f"{model} (AUC={auc:.2f})")

    print(f"\nМодель: {model}")
    print(f"Accuracy: {acc:.2f}")
    print(f"AUC: {auc:.2f}")
    print(f"Середній час на перевірку: {total_time / len(pairs):.4f} сек")
    print(f"Пікова пам'ять: {peak_mem / 1024 / 1024:.2f} MB")

    return {"accuracy": acc, "auc": auc, "avg_time": total_time / len(pairs), "peak_mem": peak_mem / 1024 / 1024}


pairs = generate_pairs(n=50)
models = ["VGG-Face", "Facenet", "ArcFace"]

results = {}
for model in models:
    results[model] = test_model(model, pairs)

plt.plot([0, 1], [0, 1], "k--")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC-криві моделей")
plt.legend()
plt.show()