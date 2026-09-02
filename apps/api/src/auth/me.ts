import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from './middleware.js';

const router = Router();

router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  res.status(200).json({
    user: {
      id: req.user.sub,
      sessionId: req.user.sid,
    },
  });
});

export default router;
