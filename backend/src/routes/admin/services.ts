import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(services);
});

router.get('/:id', async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: String(req.params.id) } });
  if (!service) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(service);
});

router.post('/', async (req: Request, res: Response) => {
  const { code, name, priceCents, isGroup, defaultCapacity } = req.body;
  if (!code || !name || priceCents === undefined) {
    res.status(400).json({ error: 'code, name, and priceCents are required' });
    return;
  }

  const service = await prisma.service.create({
    data: {
      code,
      name,
      priceCents,
      isGroup: isGroup || false,
      defaultCapacity: defaultCapacity || 1,
    },
  });
  res.status(201).json(service);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, priceCents, isGroup, defaultCapacity, active } = req.body;

  const service = await prisma.service.update({
    where: { id: String(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(priceCents !== undefined && { priceCents }),
      ...(isGroup !== undefined && { isGroup }),
      ...(defaultCapacity !== undefined && { defaultCapacity }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(service);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.service.update({
    where: { id: String(req.params.id) },
    data: { active: false },
  });
  res.json({ ok: true });
});

export { router as adminServicesRouter };
