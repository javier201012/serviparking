import { useState } from 'react'
import './App.css'

const logoImage =
  '/freepik_quiero-un-logo-profesional-para-mi-pagina-web-de-alquiler-de-caravanas-se-llama-serviparking-debe-de-ser-de-colores-azules_0001.png'

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4242'
    : '')

const mapsUrl =
  'https://www.google.es/maps/@40.2632148,-3.8341746,3a,75y,90h,90t/data=!3m7!1e1!3m5!1sMQ1JnwW6nLd95gtzeJ7c8w!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3DMQ1JnwW6nLd95gtzeJ7c8w%26yaw%3D90!7i16384!8i8192?entry=ttu&g_ep=EgoyMDI2MDMyMy4xIKXMDSoASAFQAw%3D%3D'

const gatePhotoUrl =
  'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?cb_client=maps_sv.tactile&w=900&h=600&pitch=0&panoid=MQ1JnwW6nLd95gtzeJ7c8w&yaw=90'

const navItems = [
  { label: 'Ventajas', href: '#ventajas' },
  { label: 'Ubicacion', href: '#ubicacion' },
  { label: 'Tarifa', href: '#tarifa' },
  { label: 'Proceso', href: '#proceso' },
  { label: 'Contacto', href: '#contacto' },
]

const featureCards = [
  {
    title: 'Aparcamiento preparado de verdad',
    text: 'Recinto hormigonado dentro de poligono industrial, pensado para entrar y salir con comodidad y sin maniobras tensas.',
  },
  {
    title: 'Ubicacion util para el dia a dia',
    text: 'Una base practica muy cerca de Fuenlabrada, Humanes y Moraleja de En Medio para tener la caravana bien situada.',
  },
  {
    title: 'Decision rapida y sin friccion',
    text: 'Precio mensual claro, acceso visible en Google Maps y contacto directo para resolver disponibilidad en poco tiempo.',
  },
]

const quickFacts = [
  { value: '60 EUR', label: 'cuota mensual fija' },
  { value: '24/7', label: 'acceso de consulta y coordinacion' },
  { value: '3 municipios', label: 'cerca de Fuenlabrada, Humanes y Moraleja' },
]

const valueItems = [
  'Espacio hormigonado para un uso mas comodo y limpio.',
  'Entorno industrial con accesos pensados para vehiculos de volumen.',
  'Ubicacion funcional para guardar la caravana entre escapadas.',
  'Proceso simple: consulta, disponibilidad, instrucciones y acceso.',
]

const processSteps = [
  {
    title: 'Ponte en contacto',
    text: 'Escribe o llama para contar que tipo de vehiculo quieres guardar y desde cuando te interesa la plaza.',
  },
  {
    title: 'Verifica disponibilidad',
    text: 'Se confirma si hay hueco y se resuelven dudas sobre acceso, ubicacion y condiciones del aparcamiento.',
  },
  {
    title: 'Recibe instrucciones',
    text: 'Con la plaza confirmada, recibes indicaciones claras para entrar al recinto y empezar la estancia mensual.',
  },
]

const faqItems = [
  {
    question: 'Que incluye la cuota mensual?',
    answer: 'Incluye el uso de la plaza mensual en el aparcamiento por 60 euros al mes, con acceso coordinado e informacion directa para la entrada.',
  },
  {
    question: 'Para que tipo de vehiculos es adecuado?',
    answer: 'Esta pensado para caravanas, autocaravanas y remolques que necesiten una base comoda y bien ubicada entre viajes.',
  },
  {
    question: 'Donde esta exactamente?',
    answer: 'En Calle Malva 4, Humanes, dentro de poligono industrial y muy cerca de Fuenlabrada y Moraleja de En Medio.',
  },
  {
    question: 'Puedo pagar online?',
    answer: 'Si. La web ya incorpora pago con Stripe para iniciar la contratacion mensual de forma directa.',
  },
]

const availableDates = Array.from({ length: 12 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() + index + 1)

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1)
  }

  return {
    iso: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    }),
    weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }),
  }
})

function App() {
  const [paymentError, setPaymentError] = useState('')
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dni: '',
    plate: '',
    startDate: availableDates[0]?.iso ?? '',
  })
  const checkoutStatus = new URLSearchParams(window.location.search).get('checkout')

  function openCheckoutModal() {
    setPaymentError('')
    setIsCheckoutModalOpen(true)
  }

  function closeCheckoutModal() {
    if (isRedirectingToCheckout) {
      return
    }

    setIsCheckoutModalOpen(false)
  }

  function updateCheckoutField(field, value) {
    setCheckoutForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleStripeCheckout(event) {
    event.preventDefault()

    if (
      !checkoutForm.firstName ||
      !checkoutForm.lastName ||
      !checkoutForm.email ||
      !checkoutForm.phone ||
      !checkoutForm.dni ||
      !checkoutForm.plate ||
      !checkoutForm.startDate
    ) {
      setPaymentError('Completa nombre, apellido, email, telefono, DNI, matricula y fecha antes de continuar.')
      return
    }

    try {
      setPaymentError('')
      setIsRedirectingToCheckout(true)

      const response = await fetch(`${apiBaseUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutForm),
      })

      const responseText = await response.text()
      let data = null

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        throw new Error('La API no ha devuelto JSON. Revisa que el backend o la funcion de Netlify esten desplegados.')
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'No se pudo iniciar el pago con Stripe.')
      }

      setIsCheckoutModalOpen(false)
      window.location.href = data.url
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar el pago con Stripe.',
      )
      setIsRedirectingToCheckout(false)
    }
  }

  return (
    <main className="page-shell" id="top">
      {checkoutStatus === 'success' ? (
        <div className="status-banner success-banner">
          Pago iniciado correctamente. Stripe ha confirmado la operacion y ya
          puedes seguir con el alta de la plaza mensual.
        </div>
      ) : null}

      {checkoutStatus === 'cancel' ? (
        <div className="status-banner cancel-banner">
          El pago se ha cancelado. Puedes volver a intentarlo cuando quieras.
        </div>
      ) : null}

      {paymentError ? (
        <div className="status-banner error-banner">{paymentError}</div>
      ) : null}

      <header className="site-header">
        <a className="brand-lockup" href="#top">
          <img className="brand-mark" src={logoImage} alt="Serviparking" />
          <div>
            <p className="brand-name">Serviparking</p>
            <p className="brand-subtitle">Servicio de aparcamiento para caravanas</p>
          </div>
        </a>

        <nav className="main-nav" aria-label="Menu principal">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          className="header-pay-button"
          type="button"
          onClick={openCheckoutModal}
          disabled={isRedirectingToCheckout}
        >
          {isRedirectingToCheckout ? 'Redirigiendo...' : 'Reservar plaza'}
        </button>
      </header>

      <section className="hero-section modern-hero">
        <div className="hero-copy">
          <p className="eyebrow">Aparcamiento mensual para caravanas</p>
          <h1>Reserva facil una plaza bien ubicada en Humanes para tu caravana.</h1>

          <aside className="hero-panel offer-panel" aria-label="Resumen comercial principal">
            <p className="panel-label">Resumen principal</p>
            <div className="hero-panel-grid">
              <div>
                <span className="hero-panel-key">Aparcamiento</span>
                <p>Hormigonado y dentro de poligono industrial.</p>
              </div>
              <div>
                <span className="hero-panel-key">Direccion</span>
                <p>Calle Malva 4, Humanes.</p>
              </div>
              <div>
                <span className="hero-panel-key">Ubicacion</span>
                <p>Muy cerca de Fuenlabrada, Humanes y Moraleja de En Medio.</p>
              </div>
              <div>
                <span className="hero-panel-key">Telefono</span>
                <a href="tel:+34649448383">+34 649 448 383</a>
              </div>
              <div>
                <span className="hero-panel-key">Email</span>
                <a href="mailto:ganiveamaja@gmail.com">ganiveamaja@gmail.com</a>
              </div>
              <div>
                <span className="hero-panel-key">Precio</span>
                <p className="hero-panel-price">60 euros al mes</p>
              </div>
            </div>

            <div className="hero-panel-actions">
              <a className="hero-panel-link" href={mapsUrl} target="_blank" rel="noreferrer">
                Ver en Google Maps
              </a>
              <a className="secondary-action inline-link" href="#tarifa">
                Ver tarifa y pago
              </a>
            </div>
          </aside>

          <p className="lead">
            Serviparking presenta el espacio con una estructura moderna: acceso
            rapido a informacion clave, tarifa mensual visible, ubicacion bien
            explicada y un recorrido sencillo hasta el contacto o el pago.
          </p>

          <div className="hero-actions">
            <button
              className="primary-action payment-button"
              type="button"
              onClick={openCheckoutModal}
              disabled={isRedirectingToCheckout}
            >
              {isRedirectingToCheckout ? 'Redirigiendo a Stripe...' : 'Pagar con Stripe'}
            </button>
            <a className="secondary-action" href="#contacto">
              Hablar ahora
            </a>
          </div>

          <div className="metrics-row">
            {quickFacts.map((item) => (
              <article className="metric-card" key={item.label}>
                <span>{item.value}</span>
                <p>{item.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="highlights-grid" id="ventajas" aria-label="Ventajas principales">
        {featureCards.map((item) => (
          <article className="info-card feature-card" key={item.title}>
            <p className="section-kicker">Ventaja</p>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="split-section enriched-section">
        <div>
          <p className="section-kicker">Por que elegir Serviparking</p>
          <h2>Una presentacion mas completa para que el cliente tome la decision con menos dudas.</h2>
          <p className="section-lead">
            El contenido ya no se limita a enseñar datos: ahora explica el valor
            del aparcamiento, reduce friccion y pone delante lo que de verdad
            importa para quien busca una plaza mensual.
          </p>
        </div>

        <div className="service-list value-list">
          {valueItems.map((item, index) => (
            <div className="service-row" key={item}>
              <span className="service-mark">{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="location-section" id="ubicacion">
        <div className="location-copy">
          <p className="section-kicker">Ubicacion y acceso</p>
          <h2>Mover la caravana nunca fue tan facil.</h2>
          <p>
            La cercania con Fuenlabrada, Humanes y Moraleja de En Medio lo
            convierte en un punto muy practico para guardar el vehiculo y tenerlo
            accesible cuando haga falta salir.
          </p>
          <div className="location-points">
            <div>
              <span className="hero-panel-key">Entorno</span>
              <p>Poligono industrial con accesos mas naturales para vehiculos de mayor volumen.</p>
            </div>
            <div>
              <span className="hero-panel-key">Superficie</span>
              <p>Base hormigonada para una estancia mensual mas comoda y ordenada.</p>
            </div>
            <div>
              <span className="hero-panel-key">Referencia visual</span>
              <p>La puerta y el punto exacto pueden revisarse directamente en Google Maps.</p>
            </div>
          </div>
        </div>

        <a className="location-visual" href={mapsUrl} target="_blank" rel="noreferrer">
          <img src={gatePhotoUrl} alt="Acceso al aparcamiento en Google Maps" />
          <div className="location-visual-copy">
            <span className="section-kicker">Acceso visual</span>
            <strong>Consulta la entrada antes de venir</strong>
            <p>Abre Google Maps y revisa el acceso exacto al recinto.</p>
          </div>
        </a>
      </section>

      <section className="tariff-section" id="tarifa">
        <div className="tariff-copy">
          <p className="section-kicker">Tarifa mensual</p>
          <h2>Una cuota, un pago sencillo.</h2>
        </div>

        <div className="tariff-card">
          <p className="tariff-label">Plaza mensual</p>
          <h3>60 EUR</h3>
          <p className="tariff-note">Pago mensual con Stripe para iniciar la reserva de la plaza.</p>
          <ul className="tariff-list">
            <li>Aparcamiento en recinto hormigonado.</li>
            <li>Ubicacion proxima a tres municipios clave.</li>
            <li>Coordinacion directa para entrada e instrucciones.</li>
          </ul>
          <div className="tariff-actions">
            <button
              className="primary-action payment-button"
              type="button"
              onClick={openCheckoutModal}
              disabled={isRedirectingToCheckout}
            >
              {isRedirectingToCheckout ? 'Redirigiendo a Stripe...' : 'Pagar con Stripe'}
            </button>
            <a className="secondary-action" href="#contacto">
              Consultar antes de pagar
            </a>
          </div>
        </div>
      </section>

      <section className="process-section" id="proceso">
        <div className="process-header">
          <p className="section-kicker">Proceso</p>
          <h2>Un recorrido claro desde la consulta hasta la entrada.</h2>
        </div>

        <div className="process-grid">
          {processSteps.map((step, index) => (
            <article className="process-card" key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <div className="faq-header">
          <p className="section-kicker">Preguntas frecuentes</p>
          <h2>Contenido enriquecido para resolver dudas sin obligar al usuario a llamar primero.</h2>
        </div>

        <div className="faq-grid">
          {faqItems.map((item) => (
            <article className="faq-card" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contacto">
        <div>
          <p className="section-kicker">Contacto</p>
          <h2>Habla directamente, revisa disponibilidad o paga online cuando lo tengas claro.</h2>
        </div>

        <div className="contact-card modern-contact-card">
          <div className="contact-details">
            <div>
              <span className="contact-label">Telefono</span>
              <a href="tel:+34649448383">+34 649 448 383</a>
            </div>
            <div>
              <span className="contact-label">Email</span>
              <a href="mailto:ganiveamaja@gmail.com">ganiveamaja@gmail.com</a>
            </div>
            <div>
              <span className="contact-label">Direccion</span>
              <p>Calle Malva 4, Humanes</p>
            </div>
            <div>
              <span className="contact-label">Precio</span>
              <p>60 euros al mes</p>
            </div>
          </div>

          <div className="contact-actions-row">
            <button
              className="primary-action payment-button"
              type="button"
              onClick={openCheckoutModal}
              disabled={isRedirectingToCheckout}
            >
              {isRedirectingToCheckout ? 'Redirigiendo a Stripe...' : 'Pagar con Stripe'}
            </button>
            <a className="secondary-action call-action" href="tel:+34649448383">
              Llamar ahora
            </a>
            <a className="secondary-action" href={mapsUrl} target="_blank" rel="noreferrer">
              Abrir ubicacion
            </a>
          </div>
        </div>
      </section>

      {isCheckoutModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeCheckoutModal}>
          <div
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="checkout-modal-header">
              <div>
                <p className="section-kicker">Pago y reserva</p>
                <h2 id="checkout-modal-title">Antes de pagar, completa tus datos.</h2>
              </div>
              <button className="modal-close" type="button" onClick={closeCheckoutModal}>
                Cerrar
              </button>
            </div>

            <form className="checkout-form" onSubmit={handleStripeCheckout}>
              <label className="form-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={checkoutForm.firstName}
                  onChange={(event) => updateCheckoutField('firstName', event.target.value)}
                  placeholder="Javier"
                  required
                />
              </label>

              <label className="form-field">
                <span>Apellido</span>
                <input
                  type="text"
                  value={checkoutForm.lastName}
                  onChange={(event) => updateCheckoutField('lastName', event.target.value)}
                  placeholder="Garcia"
                  required
                />
              </label>

              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  value={checkoutForm.email}
                  onChange={(event) => updateCheckoutField('email', event.target.value.trim())}
                  placeholder="cliente@email.com"
                  required
                />
              </label>

              <label className="form-field">
                <span>Telefono</span>
                <input
                  type="tel"
                  value={checkoutForm.phone}
                  onChange={(event) => updateCheckoutField('phone', event.target.value)}
                  placeholder="+34 600 000 000"
                  required
                />
              </label>

              <label className="form-field">
                <span>DNI</span>
                <input
                  type="text"
                  value={checkoutForm.dni}
                  onChange={(event) => updateCheckoutField('dni', event.target.value.toUpperCase())}
                  placeholder="12345678A"
                  required
                />
              </label>

              <label className="form-field">
                <span>Matricula de la caravana</span>
                <input
                  type="text"
                  value={checkoutForm.plate}
                  onChange={(event) => updateCheckoutField('plate', event.target.value.toUpperCase())}
                  placeholder="1234ABC"
                  required
                />
              </label>

              <div className="date-picker-block">
                <div>
                  <span className="section-kicker">Fechas disponibles</span>
                  <p className="date-picker-help">Selecciona una fecha de entrada disponible para iniciar la plaza mensual.</p>
                </div>

                <div className="available-dates-grid">
                  {availableDates.map((date) => (
                    <button
                      key={date.iso}
                      className={date.iso === checkoutForm.startDate ? 'date-option selected-date' : 'date-option'}
                      type="button"
                      onClick={() => updateCheckoutField('startDate', date.iso)}
                    >
                      <span>{date.weekday}</span>
                      <strong>{date.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="checkout-actions">
                <button className="primary-action payment-button" type="submit" disabled={isRedirectingToCheckout}>
                  {isRedirectingToCheckout ? 'Redirigiendo a Stripe...' : 'Continuar al pago'}
                </button>
                <button className="secondary-action" type="button" onClick={closeCheckoutModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
