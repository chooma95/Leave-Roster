import { Router } from 'express';

const router = Router();

// Stub routes - to be implemented
router.get('/', (req: any, res: any) => res.json({ message: 'Staff routes' }));

export { router as staffRouter };
