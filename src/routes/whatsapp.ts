import express from 'express';
import crypto from 'node:crypto';
import whatsappService from '../services/whatsapp.js';
import parserService from '../services/parser.js';
import ledgerService from '../services/ledger.js';
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
    // TODO: Configure WHATSAPP_APP_SECRET and enable signature verification for production
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature && process.env['WHATSAPP_APP_SECRET']) {
      const appSecret = process.env['WHATSAPP_APP_SECRET'];
      const hmac = crypto.createHmac('sha256', appSecret);
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

              // Try to parse as a sales message
              const parseResult = await parserService.parseSalesMessage(messageText);

              if (parseResult.success && parseResult.sale) {
                // Get or create business
                const businessResult = await ledgerService.getOrCreateBusiness(from);
                
                if (businessResult.success && businessResult.data) {
                  // Record the sale
                  const recordResult = await ledgerService.recordSale(
                    businessResult.data.id,
                    parseResult.sale,
                    messageText
                  );

                  if (recordResult.success) {
                    // Send confirmation message
                    const items = parseResult.sale.items
                      .map(item => `${item.quantity}x ${item.productName}`)
                      .join(', ');
                    const confirmation = `Got it: ${items}, KSh ${parseResult.sale.totalAmount} ✅`;
                    
                    const replyResponse = await whatsappService.sendMessage(from, confirmation);
                    if (!replyResponse.success) {
                      console.error('Failed to send confirmation reply:', replyResponse.error);
                    }
                  } else {
                    // Send error message
                    const errorReply = await whatsappService.sendMessage(
                      from,
                      `Sorry, I couldn't save that sale. Error: ${recordResult.error}`
                    );
                    if (!errorReply.success) {
                      console.error('Failed to send error reply:', errorReply.error);
                    }
                  }
                } else {
                  console.error('Failed to get/create business:', businessResult.error);
                }
              } else {
                // Not a sales message or parsing failed
                const fallbackReply = await whatsappService.sendMessage(
                  from,
                  `Got your message: ${messageText}\n\n(Send sales like "2 sodas for 100" to log them)`
                );
                if (!fallbackReply.success) {
                  console.error('Failed to send fallback reply:', fallbackReply.error);
                }
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