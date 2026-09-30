import express from 'express';
import crypto from 'node:crypto';
import whatsappService from '../services/whatsapp.js';
import type { WhatsAppWebhookPayload } from '../types/whatsapp.js';

const router = express.Router();

// GET /webhook/whatsapp - Meta webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'];

  console.log('Webhook verification attempt:', { mode, token, hasVerifyToken: !!verifyToken });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    return res.status(403).send('Forbidden');
  }
});

// POST /webhook/whatsapp - Receive incoming messages
router.post('/whatsapp', async (req, res) => {
  try {
    const payload = req.body as WhatsAppWebhookPayload;
    
    console.log('Received WhatsApp webhook:', JSON.stringify(payload, null, 2));

    // Verify webhook signature (optional but recommended for production)
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature) {
      const verifyToken = process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'];
      const hmac = crypto.createHmac('sha256', verifyToken || '');
      hmac.update(JSON.stringify(req.body));
      const expectedSignature = `sha256=${hmac.digest('hex')}`;
      
      if (signature !== expectedSignature) {
        console.error('Webhook signature verification failed');
        return res.status(403).send('Forbidden');
      }
    }

    // Process messages
    if (payload.object === 'whatsapp_business_account') {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              const from = message.from;
              const messageText = message.text?.body || '[non-text message]';
              
              console.log(`Message from ${from}: ${messageText}`);

              // Echo the message back
              const echoResponse = await whatsappService.sendMessage(
                from,
                `Got your message: ${messageText}`
              );

              if (!echoResponse.success) {
                console.error('Failed to send echo reply:', echoResponse.error);
              }
            }
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).send('Internal Server Error');
  }
});

export default router;