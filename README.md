# Serviparking

Proyecto base con Vite + React para una web de aparcamiento de caravanas.

## Stack

- Vite
- React
- CSS plano sin librerias adicionales

## Scripts

- `npm run api`: API local para Stripe
- `npm run dev`: entorno de desarrollo
- `npm run dev:full`: frontend + API de Stripe a la vez
- `npm run build`: build de produccion
- `npm run lint`: revision con ESLint
- `npm run preview`: previsualizacion local del build

## Stripe

La integracion de pago usa Stripe Checkout con una API propia para no exponer la clave secreta en el frontend.

1. Crea un archivo `.env` a partir de `.env.example`
2. Añade tu clave `STRIPE_SECRET_KEY`
3. Ejecuta `npm run dev:full`

La API crea una suscripcion mensual de 60 euros y redirige a Stripe para completar el pago.

## Netlify

Para que el pago funcione en Netlify no basta con desplegar solo el frontend estatico: tambien hace falta una funcion serverless para el endpoint de checkout.

Variables de entorno necesarias en Netlify:

- `STRIPE_SECRET_KEY`
- `MONGODB_URI`
- `MONGODB_DB_NAME`

El proyecto incluye una funcion en `netlify/functions/create-checkout-session.js` y una redireccion para que `POST /api/create-checkout-session` funcione tambien en produccion.

## Estado actual

- Landing inicial en espanol
- Informacion comercial principal visible desde el bloque inicial
- Diseño responsive orientado a presentar servicios, ventajas y contacto

## Siguientes ampliaciones recomendadas

- Añadir formulario de consulta o reserva
- Integrar mapa, galeria o testimonios si el negocio los necesita
- Ajustar SEO y textos finales de marca
