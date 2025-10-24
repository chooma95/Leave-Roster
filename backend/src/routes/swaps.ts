import { Router } from 'express';

const router = Router();

// Stub routes - to be implemented  
router.get('/', (req: any, res: any) => res.json({ message: 'Swap routes' }));

export { router as swapRouter };
