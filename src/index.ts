import 'dotenv/config';
import express from 'express';
import prisma from './db/client.js';
import whatsappRoutes from './routes/whatsapp.js';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await prisma.$connect();
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: String(error) });
  }
});

// WhatsApp webhook routes
app.use('/webhook', whatsappRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});