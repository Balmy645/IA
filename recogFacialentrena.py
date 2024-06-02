import os
import cv2
import numpy as np

# Ruta al directorio de datos
data_dir = 'ruta/al/dataset'

# Lista de etiquetas de emociones
emotions = ['happy', 'sad', 'surprised', 'angry', 'disgust', 'fearful', 'neutral']

# Dimensiones deseadas de las imágenes
img_size = (200, 200)

# Inicializar listas para las imágenes y etiquetas
faces = []
labels = []

# Cargar las imágenes y etiquetas
for emotion in emotions:
    emotion_dir = os.path.join(data_dir, emotion)
    for img_name in os.listdir(emotion_dir):
        img_path = os.path.join(emotion_dir, img_name)
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is not None:
            img = cv2.resize(img, img_size)
            faces.append(img)
            labels.append(emotions.index(emotion))

# Convertir las listas a arrays de numpy
faces = np.array(faces)
labels = np.array(labels)

# Asegurarse de que las imágenes tengan el formato correcto
faces = faces.reshape(faces.shape[0], img_size[0], img_size[1], 1)
faces = faces.astype('float32') / 255.0

print(f"Cargadas {faces.shape[0]} imágenes con dimensiones {faces.shape[1:]}")

# Opcional: dividir en entrenamiento y prueba
from sklearn.model_selection import train_test_split

faces_train, faces_test, labels_train, labels_test = train_test_split(faces, labels, test_size=0.2, random_state=42)

print(f"Conjunto de entrenamiento: {faces_train.shape[0]} imágenes")
print(f"Conjunto de prueba: {faces_test.shape[0]} imágenes")


    