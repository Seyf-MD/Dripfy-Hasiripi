import express, { Request, Response } from 'express';
import { getForecast, listForecastScenarios } from '../../services/forecasting/index.js';

export const financeForecastRouter = express.Router();

financeForecastRouter.get('/', async (req: Request, res: Response) => {
  const scenario = typeof req.query.scenario === 'string' ? req.query.scenario : undefined;
  const horizonParam = Array.isArray(req.query.horizon) ? req.query.horizon[0] : req.query.horizon;
  const horizon = horizonParam ? Number(horizonParam) : undefined;

  try {
    const data = await getForecast({ scenario, horizon });
    res.json({ ok: true, data });
  } catch (error) {
    console.error('[finance-forecast] forecast generation failed', error);
    res.status(500).json({ ok: false, error: { message: 'Finansal tahminler hesaplanamadı.' } });
  }
});

financeForecastRouter.get('/scenarios', (_req: Request, res: Response) => {
  try {
    const scenarios = listForecastScenarios();
    res.json({ ok: true, scenarios });
  } catch (error) {
    console.error('[finance-forecast] scenario listing failed', error);
    res.status(500).json({ ok: false, error: { message: 'Senaryo listesi getirilemedi.' } });
  }
});

export default financeForecastRouter;
