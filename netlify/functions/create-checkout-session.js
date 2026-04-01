import { randomUUID } from 'node:crypto'
import { MongoClient } from 'mongodb'
import Stripe from 'stripe'

const mongoUri = process.env.MONGODB_URI
const mongoDbName = process.env.MONGODB_DB_NAME || 'caravanas'

let mongoClientPromise

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

async function getReservationsCollection() {
  if (!mongoUri) {
    throw new Error('Falta configurar MONGODB_URI en Netlify.')
  }

  if (!mongoClientPromise) {
    const client = new MongoClient(mongoUri)
    mongoClientPromise = client.connect()
  }

  const client = await mongoClientPromise
  const database = client.db(mongoDbName)
  const collection = database.collection('reservations')

  await collection.createIndex({ id: 1 }, { unique: true })
  await collection.createIndex({ createdAt: -1 })

  return collection
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Metodo no permitido.' })
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return jsonResponse(500, {
        error: 'Falta configurar STRIPE_SECRET_KEY en Netlify.',
      })
    }

    const payload = JSON.parse(event.body || '{}')
    const { firstName, lastName, email, phone, dni, plate, startDate } = payload

    if (!firstName || !lastName || !email || !phone || !dni || !plate || !startDate) {
      return jsonResponse(400, {
        error: 'Nombre, apellido, email, telefono, DNI, matricula y fecha de entrada son obligatorios.',
      })
    }

    const reservations = await getReservationsCollection()
    const reservationId = randomUUID()

    await reservations.insertOne({
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
      event.headers.origin ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      'http://localhost:8888'

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

    await reservations.updateOne(
      { id: reservationId },
      {
        $set: {
          status: 'checkout_created',
          stripeSessionId: session.id,
          updatedAt: new Date().toISOString(),
        },
      },
    )

    return jsonResponse(200, {
      url: session.url,
      reservationId,
    })
  } catch (error) {
    return jsonResponse(500, {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar el pago con Stripe.',
    })
  }
}