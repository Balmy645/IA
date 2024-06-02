import cv2

# Crear el modelo de Eigenfaces
model = cv2.face.EigenFaceRecognizer_create()

# Entrenar el modelo
model.train(faces_train, labels_train)

# Guardar el modelo entrenado
model.save('modelo_eigenfaces.xml')
