const express = require('express');
const app = express();
const stripe = require('stripe')('sk_test_yourStripeSecretKeyHere'); // Sostituisci con la tua chiave segreta di Stripe

// Configurazione PayPal con @paypal/checkout-server-sdk
const paypal = require('@paypal/checkout-server-sdk');
const Environment = paypal.core.SandboxEnvironment; // Per la modalità sandbox
const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment('YOUR_PAYPAL_CLIENT_ID', 'YOUR_PAYPAL_CLIENT_SECRET') // Sostituisci con le tue credenziali sandbox
);

app.use(express.json());

/* Endpoint per Stripe Checkout */
app.post('/create-checkout-session', async (req, res) => {
  const { productName, productPrice } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: productName },
          unit_amount: Math.round(parseFloat(productPrice) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:4242/success.html',
      cancel_url: 'http://localhost:4242/cancel.html',
    });
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Errore Stripe:", error);
    res.status(500).json({ error: error.message });
  }
});

/* Endpoint per creare un ordine PayPal */
app.post('/create-paypal-order', async (req, res) => {
  const { productName, productPrice } = req.body;
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      description: productName,
      amount: {
        currency_code: "EUR",
        value: productPrice // Il prezzo deve essere una stringa, ad esempio "10.00"
      }
    }],
    application_context: {
      brand_name: "La Tua Azienda",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: "http://localhost:4242/success.html",
      cancel_url: "http://localhost:4242/cancel.html"
    }
  });
  try {
    const order = await paypalClient.execute(request);
    res.json({ orderID: order.result.id });
  } catch (error) {
    console.error("Errore PayPal (creazione ordine):", error);
    res.status(500).json({ error: error.message });
  }
});

/* Endpoint per catturare un ordine PayPal */
app.post('/capture-paypal-order', async (req, res) => {
  const { orderID } = req.body;
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});
  try {
    const capture = await paypalClient.execute(request);
    res.json(capture.result);
  } catch (error) {
    console.error("Errore PayPal (cattura ordine):", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () => console.log('Server in ascolto sulla porta 4242'));
