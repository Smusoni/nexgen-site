import { Router } from 'express';
import { servicesRouter } from './services';
import { slotsRouter } from './slots';
import { bookingsRouter } from './bookings';

const router = Router();

router.use('/services', servicesRouter);
router.use('/slots', slotsRouter);
router.use('/bookings', bookingsRouter);

export { router as publicRouter };
