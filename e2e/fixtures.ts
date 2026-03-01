import { test as base, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

export const test = base.extend({
  page: async ({ page, browserName }, runFixture, testInfo) => {
    const canCollectCoverage =
      browserName === 'chromium' &&
      !!page.coverage &&
      typeof page.coverage.startJSCoverage === 'function' &&
      typeof page.coverage.stopJSCoverage === 'function';

    if (canCollectCoverage) {
      await page.coverage.startJSCoverage({
        resetOnNavigation: false,
      });
    }

    await runFixture(page);

    if (canCollectCoverage) {
      const coverageData = await page.coverage.stopJSCoverage();
      await addCoverageReport(coverageData, testInfo);
    }
  },
});

export { expect };
