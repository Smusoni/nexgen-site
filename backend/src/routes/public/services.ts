import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { priceCents: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      priceCents: true,
      isGroup: true,
      defaultCapacity: true,
    },
  });
  res.json(services);
});

export { router as servicesRouter };
