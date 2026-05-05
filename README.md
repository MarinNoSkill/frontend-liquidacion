# Frontend - Liquidación Airbnb

Este proyecto es el frontend de la aplicación de liquidación de reservas de Airbnb. Utiliza React y TailwindCSS.

## Estructura esperada
- Formulario para ingresar datos de la propiedad, propietario, huésped, nacionalidad, tipo de documento, extranjero/residente, número de reserva.
- Módulo de liquidación base y gastos de reserva.
- Cálculos automáticos y validaciones.
- Exportación a Excel.
- Comunicación con backend vía API.

## Instalación
1. Instalar dependencias: `npm install`
2. Iniciar desarrollo: `npm run dev`

---

# Backend - Liquidación Airbnb

El backend está en la carpeta `/backend` y expone endpoints para cálculos y exportación a Excel. No usa base de datos, solo cache en memoria.