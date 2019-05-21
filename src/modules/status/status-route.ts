import StatusController from './status-controller';
import * as express from 'express';

const statusRouter: express.Router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /status:
 *   get:
 *     description: Status call of the server
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK
 *         schema:
 *          type: object
 *          properties:
 *            status:
 *              type: boolean
 *            version:
 *              type: string
 */
statusRouter.get('/status', StatusController);

/**
 * @swagger
 * /status:
 *   get:
 *     description: Status call of the server
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: OK
 *         schema:
 *          type: object
 *          properties:
 *            status:
 *              type: boolean
 *            version:
 *              type: string
 */
statusRouter.get('/', StatusController);

export default statusRouter;
