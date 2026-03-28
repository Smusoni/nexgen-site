import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const where: any = {};

  if (status) where.status = status;

  const take = Math.min(parseInt(limit as string, 10) || 20, 100);
  const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            playerName: true,
            email: true,
            service: { select: { name: true, code: true } },
            slot: { select: { startAt: true, endAt: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({ payments, total, page: skip / take + 1, pages: Math.ceil(total / take) });
});

export { router as adminPaymentsRouter };
