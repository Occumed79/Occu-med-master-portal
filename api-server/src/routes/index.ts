import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portalStateRouter from "./portalState";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portalStateRouter);

export default router;
