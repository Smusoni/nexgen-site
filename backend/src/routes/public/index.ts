import { Router } from 'express';
import { servicesRouter } from './services';
import { slotsRouter } from './slots';
import { bookingsRouter } from './bookings';
import { checkoutRouter } from './checkout';

const router = Router();

router.use('/services', servicesRouter);
router.use('/slots', slotsRouter);
router.use('/bookings', bookingsRouter);
router.use('/checkout', checkoutRouter);

export { router as publicRouter };
