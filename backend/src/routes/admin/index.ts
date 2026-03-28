import { Router } from 'express';
import { authRouter } from './auth';
import { overviewRouter } from './overview';
import { adminServicesRouter } from './services';
import { adminSlotsRouter } from './slots';
import { adminBookingsRouter } from './bookings';
import { adminPaymentsRouter } from './payments';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.use('/auth', authRouter);

router.use(requireAdmin);
router.use('/overview', overviewRouter);
router.use('/services', adminServicesRouter);
router.use('/slots', adminSlotsRouter);
router.use('/bookings', adminBookingsRouter);
router.use('/payments', adminPaymentsRouter);

export { router as adminRouter };
