import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import slotsRouter from "./slots";
import vehiclesRouter from "./vehicles";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(slotsRouter);
router.use(vehiclesRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
