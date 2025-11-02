import 'dotenv/config';
import { ensureDataEnvironment } from '../../server/services/storageService.js';
import { getForecast, listForecastScenarios } from '../../services/forecasting/index.js';

async function run() {
  try {
    await ensureDataEnvironment();
    const scenarios = listForecastScenarios();
    const results = await Promise.all(
      scenarios.map((scenario) =>
        getForecast({ scenario: scenario.name }).then(() => ({ scenario: scenario.name, ok: true }))
      ),
    );

    results.forEach((result) => {
      if (result.ok) {
        console.log(`[cron] Forecast cache refreshed for scenario="${result.scenario}"`);
      }
    });
    console.log('[cron] Forecast refresh completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[cron] Forecast refresh failed:', error);
    process.exit(1);
  }
}

run();
