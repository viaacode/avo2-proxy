import * as express from 'express';
import statusRoutes from './status/status-route';

const router: express.Router = express.Router({ mergeParams: true });

router.use('/', statusRoutes);

export default router;
