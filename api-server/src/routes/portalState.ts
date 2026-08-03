import { pool } from "@workspace/db";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

function hasAdminAccess(password: string | undefined): boolean {
  const configuredPassword =
    process.env["ADMIN_PASSWORD"] ?? process.env["VITE_ADMIN_PASSWORD"] ?? "";

  return configuredPassword.length > 0 && password === configuredPassword;
}

router.get("/portal-state", async (_req, res, next) => {
  try {
    const result = await pool.query<{ data: unknown }>(
      "SELECT data FROM portal_state WHERE id = 1",
    );

    res.json(result.rows[0]?.data ?? {});
  } catch (error) {
    next(error);
  }
});

router.put("/portal-state", async (req, res, next) => {
  if (!hasAdminAccess(req.get("x-admin-password"))) {
    res.status(401).json({ error: "Admin authorization failed." });
    return;
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "Portal state must be a JSON object." });
    return;
  }

  try {
    const result = await pool.query<{ data: unknown }>(
      `INSERT INTO portal_state (id, data, updated_at)
       VALUES (1, $1::jsonb, now())
       ON CONFLICT (id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = now()
       RETURNING data`,
      [JSON.stringify(req.body)],
    );

    res.json(result.rows[0]?.data ?? req.body);
  } catch (error) {
    next(error);
  }
});

export default router;
