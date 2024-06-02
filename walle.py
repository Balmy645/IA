import cv2
import numpy as np

imagen = cv2.imread('./assets/walles.jpg')

imagen_hsv = cv2.cvtColor(imagen, cv2.COLOR_BGR2HSV)

# Rango para el rojo (puede variar según la tonalidad exacta del rojo)
rojo_bajo1 = np.array([0, 60, 65])
rojo_alto1 = np.array([5, 80, 90])

rojo_bajo2 = np.array([5, 80, 85])
rojo_alto2 = np.array([5, 90, 90])

# Rango para el blanco
blanco_bajo = np.array([0, 0, 200])
blanco_alto = np.array([0, 25, 255])

# Mascaras de color

mascara_rojo1 = cv2.inRange(imagen_hsv, rojo_bajo1, rojo_alto1)
mascara_rojo2 = cv2.inRange(imagen_hsv, rojo_bajo2, rojo_alto2)

mascara_rojo = cv2.add(mascara_rojo1, mascara_rojo2)

mascara_blanco = cv2.inRange(imagen_hsv, blanco_bajo, blanco_alto)

# Combinar mascaras

mascara_combinada = cv2.bitwise_and(mascara_rojo, mascara_blanco)

# Identificación de candidato de walle

contornos, _ = cv2.findContours(mascara_combinada, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Identificación por tamaño y forma

for cnt in contornos:
    area = cv2.contourArea(cnt)
    if area > 50:  # Ajusta este valor según sea necesario
        x, y, w, h = cv2.boundingRect(cnt)
        cv2.rectangle(imagen, (x, y), (x+w, y+h), (0, 255, 0), 2)


# Resultado

cv2.imshow('Imagen', imagen)
cv2.waitKey(0)
cv2.destroyAllWindows()
