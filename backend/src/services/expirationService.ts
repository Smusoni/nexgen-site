import cron from 'node-cron';
import { expirePendingBookings } from './bookingService';

export function startExpirationJob() {
  cron.schedule('*/2 * * * *', async () => {
    try {
      await expirePendingBookings();
    } catch (err) {
      console.error('Expiration job error:', err);
    }
  });
  console.log('Booking expiration job scheduled (every 2 minutes)');
}
