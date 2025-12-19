import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from deepface import DeepFace
from itertools import combinations
import random

DATASET_PATH = "../datasets/fairface-img-margin025-trainval"
LABEL_FILE_PATH = "fairface_label_val.csv"
MODEL_NAME = "ArcFace"
DETECTOR = "mtcnn"
DISTANCE_METRIC = "cosine"


class BiasAnalyzer:
    def __init__(self, img_folder_path, label_file_path):
        self.img_folder_path = os.path.abspath(img_folder_path)
        self.label_file_path = label_file_path
        self.metadata = []
        self.embeddings = {}

    def load_data(self, limit=None):
        print(f"--- Завантаження даних з {self.label_file_path} ---")

        if not os.path.exists(self.label_file_path):
            print(f"Помилка: Файл з мітками '{self.label_file_path}' не знайдено.", file=sys.stderr)
            return False

        df = pd.read_csv(self.label_file_path)
        
        df['path'] = df['file'].apply(lambda x: os.path.join(self.img_folder_path, x))
        
        df = df[df['path'].apply(os.path.exists)]

        if len(df) == 0:
            print("Помилка: Не знайдено жодного зображення. Перевірте, що:", file=sys.stderr)
            print(f"  1. Шлях '{self.img_folder_path}' є правильним.", file=sys.stderr)
            print(f"  2. Всередині нього є папка 'val' з зображеннями.", file=sys.stderr)
            return False

        if limit:
            df = df.sample(n=min(limit, len(df)), random_state=42)

        self.metadata = df.to_dict('records')
        print(f"Завантажено {len(self.metadata)} зображень.")
        return True

    def get_embeddings(self):
        print(f"--- Генерація векторів (Model: {MODEL_NAME}) ---")
        valid_data = []

        for idx, item in enumerate(self.metadata):
            try:
                embedding_obj = DeepFace.represent(
                    img_path=item['path'],
                    model_name=MODEL_NAME,
                    detector_backend=DETECTOR,
                    enforce_detection=False,
                    align=True
                )
                vector = embedding_obj[0]["embedding"]
                self.embeddings[item['path']] = vector
                valid_data.append(item)

            except Exception as e:
                print(f"Помилка обробки {item['path']}: {e}")

            if (idx + 1) % 10 == 0:
                print(f"Оброблено {idx + 1} / {len(self.metadata)}")

        self.metadata = valid_data
        print("Векторизація завершена.")

    def evaluate_bias(self, group_by='race'):
        print(f"--- Аналіз упереджень за групою '{group_by}' ---")
        df = pd.DataFrame(self.metadata)
        results = []

        if group_by not in df.columns:
            print(f"Помилка: колонка '{group_by}' відсутня в даних.", file=sys.stderr)
            return pd.DataFrame()

        groups = df[group_by].unique()

        for group in groups:
            group_df = df[df[group_by] == group]
            if len(group_df) < 2: continue

            paths = group_df['path'].tolist()
            
            pairs = list(combinations(paths, 2))
            if len(pairs) > 500:
                pairs = random.sample(pairs, 500)

            distances = []
            for img1, img2 in pairs:
                v1 = self.embeddings.get(img1)
                v2 = self.embeddings.get(img2)
                if v1 is not None and v2 is not None:
                    cos_sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                    distance = 1 - cos_sim
                    distances.append(distance)

            if distances:
                avg_dist = np.mean(distances)
                results.append({"Group": group, "Avg_Distance": avg_dist, "Samples": len(distances)})

        return pd.DataFrame(results)


def plot_results(df_results, group_by):
    if df_results.empty:
        print("Немає даних для побудови графіка.")
        return

    plt.figure(figsize=(10, 6))
    df_results = df_results.sort_values('Avg_Distance', ascending=False)
    
    colors = plt.cm.viridis(np.linspace(0, 1, len(df_results)))
    bars = plt.bar(df_results['Group'], df_results['Avg_Distance'], color=colors)

    plt.title(f'Середня внутрішньогрупова дистанція (Модель: {MODEL_NAME})', fontsize=14)
    plt.xlabel(f'Група ({group_by.capitalize()})', fontsize=12)
    plt.ylabel('Середня Cosine Distance (менше = краще)', fontsize=12)
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.xticks(rotation=45, ha="right")

    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width() / 2., height, f'{height:.4f}', ha='center', va='bottom')

    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    analyzer = BiasAnalyzer(img_folder_path=DATASET_PATH, label_file_path=LABEL_FILE_PATH)
    
    if analyzer.load_data(limit=500):
        analyzer.get_embeddings()

        bias_stats_race = analyzer.evaluate_bias(group_by='race')
        print("\nРезультати аналізу за расою:")
        print(bias_stats_race)

        bias_stats_gender = analyzer.evaluate_bias(group_by='gender')
        print("\nРезультати аналізу за статтю:")
        print(bias_stats_gender)

        if bias_stats_race is not None and not bias_stats_race.empty:
            plot_results(bias_stats_race, group_by='race')
        
        if bias_stats_gender is not None and not bias_stats_gender.empty:
            plot_results(bias_stats_gender, group_by='gender')
