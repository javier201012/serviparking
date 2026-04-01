import { randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import express from 'express'
import { MongoClient } from 'mongodb'
import Stripe from 'stripe'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4242)
const mongoUri = process.env.MONGODB_URI
const mongoDbName = process.env.MONGODB_DB_NAME || 'caravanas'
const mongoClient = mongoUri ? new MongoClient(mongoUri) : null

let reservationsCollection

app.use(express.json())

app.use((request, response, next) => {
  const origin = request.headers.origin
  const allowedOrigins = new Set([process.env.APP_URL].filter(Boolean))
  const isLocalOrigin =
    typeof origin === 'string' &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)

  if (origin && (allowedOrigins.has(origin) || isLocalOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

async function connectToDatabase() {
  if (!mongoClient) {
    throw new Error('Falta configurar MONGODB_URI en el servidor.')
  }

  await mongoClient.connect()

  const database = mongoClient.db(mongoDbName)
  reservationsCollection = database.collection('reservations')

  await reservationsCollection.createIndex({ id: 1 }, { unique: true })
  await reservationsCollection.createIndex({ createdAt: -1 })
}

function getReservationsCollection() {
  if (!reservationsCollection) {
    throw new Error('La conexion con MongoDB no esta disponible.')
  }

  return reservationsCollection
}

async function readReservations() {
  const collection = getReservationsCollection()
  const reservations = await collection.find({}).sort({ createdAt: -1 }).toArray()

  return reservations.map(({ _id, ...reservation }) => ({
    mongoId: _id.toString(),
    ...reservation,
  }))
}

async function appendReservation(reservation) {
  const collection = getReservationsCollection()
  await collection.insertOne(reservation)
}

async function updateReservation(reservationId, updates) {
  const collection = getReservationsCollection()
  await collection.updateOne(
    { id: reservationId },
    {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
  )
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, database: reservationsCollection ? 'connected' : 'disconnected' })
})

app.get('/api/reservations', async (_request, response) => {
  try {
    const reservations = await readReservations()

    response.json({
      count: reservations.length,
      reservations,
    })
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'No se pudieron leer las reservas guardadas.',
    })
  }
})

app.post('/api/create-checkout-session', async (request, response) => {
  let reservationId = ''

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      response.status(500).json({
        error: 'Falta configurar STRIPE_SECRET_KEY en el servidor.',
      })
      return
    }

    if (!mongoUri) {
      response.status(500).json({
        error: 'Falta configurar MONGODB_URI en el servidor.',
      })
      return
    }

    const { firstName, lastName, email, phone, dni, plate, startDate } = request.body ?? {}

    if (!firstName || !lastName || !email || !phone || !dni || !plate || !startDate) {
      response.status(400).json({
        error: 'Nombre, apellido, email, telefono, DNI, matricula y fecha de entrada son obligatorios.',
      })
      return
    }

    reservationId = randomUUID()

    await appendReservation({
      id: reservationId,
      firstName: String(firstName),
      lastName: String(lastName),
      email: String(email),
      phone: String(phone),
      dni: String(dni),
      plate: String(plate),
      startDate: String(startDate),
      status: 'pending_checkout',
      createdAt: new Date().toISOString(),
    })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const appUrl =
      request.headers.origin || process.env.APP_URL || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      billing_address_collection: 'required',
      customer_email: String(email),
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: 6000,
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: 'Serviparking - plaza mensual',
              description: 'Aparcamiento mensual para caravanas en Humanes.',
            },
          },
        },
      ],
      metadata: {
        business: 'Serviparking',
        plan: 'plaza-mensual',
        reservationId,
        firstName: String(firstName),
        lastName: String(lastName),
        email: String(email),
        phone: String(phone),
        dni: String(dni),
        plate: String(plate),
        startDate: String(startDate),
      },
    })

    await updateReservation(reservationId, {
      status: 'checkout_created',
      stripeSessionId: session.id,
    })

    response.json({ url: session.url, reservationId })
  } catch (error) {
    if (reservationId) {
      await updateReservation(reservationId, {
        status: 'checkout_failed',
        errorMessage:
          error instanceof Error
            ? error.message
            : 'No se pudo crear la sesion de pago.',
      })
    }

    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo crear la sesion de pago.',
    })
  }
})

connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Stripe API listening on http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('No se pudo conectar con MongoDB:', error)
    process.exit(1)
  })