import { isResearchDone } from '../../models/DripCampaign';
import { ScrapeProgressCardComponent } from './scrape-progress-card.component';

/**
 * `__areHiddenPassesDone`: the passes the send gate waits for that have no step on the card.
 * Called off the prototype: it reads only `scrapeEstimate` and the campaign it is given.
 */
describe('ScrapeProgressCardComponent.__areHiddenPassesDone', () => {
  const done = (campaign: any, passes: string[] = ['web', 'map', 'linkedin']) =>
    (ScrapeProgressCardComponent.prototype as any).__areHiddenPassesDone.call(
      {
        scrapeEstimate: { passes: passes.map(pass => ({ pass })) },
        __withSportsApplies: (ScrapeProgressCardComponent.prototype as any).__withSportsApplies,
      },
      campaign,
    );

  it('waits for LinkedIn, which has no step of its own', () => {
    expect(done({ linkedinScrapeStatus: 'RUNNING' })).toBe(false);
    expect(done({ linkedinScrapeStatus: 'PENDING' })).toBe(false);
    expect(done({ linkedinScrapeStatus: 'SUCCEEDED' })).toBe(true);
  });

  it('a campaign from an API without the LinkedIn column counts as done', () => {
    expect(done({})).toBe(true);
  });

  it('waits for sports only while the API includes it', () => {
    expect(done({ sportsScrapeStatus: 'PENDING', linkedinScrapeStatus: 'SUCCEEDED' })).toBe(true);
    expect(
      done({ sportsScrapeStatus: 'PENDING', linkedinScrapeStatus: 'SUCCEEDED' }, ['web', 'map', 'sports', 'linkedin']),
    ).toBe(false);
  });
});

describe('isResearchDone', () => {
  const done = { webScrapeStatus: 'SUCCEEDED', mapScrapeStatus: 'SUCCEEDED' };

  it('waits for LinkedIn and, when it applies, sports — not web and map alone', () => {
    expect(isResearchDone({ ...done, linkedinScrapeStatus: 'RUNNING' })).toBe(false);
    expect(isResearchDone({ ...done, linkedinScrapeStatus: 'SUCCEEDED' })).toBe(true);
    expect(
      isResearchDone({ ...done, linkedinScrapeStatus: 'SUCCEEDED', sportsApplies: true, sportsScrapeStatus: 'PENDING' }),
    ).toBe(false);
  });

  it("an older drip's leftover sports status is ignored, and a missing status counts as done", () => {
    expect(
      isResearchDone({ ...done, linkedinScrapeStatus: 'SUCCEEDED', sportsApplies: false, sportsScrapeStatus: 'PENDING' }),
    ).toBe(true);
    expect(isResearchDone(done)).toBe(true);
    expect(isResearchDone({ ...done, mapScrapeStatus: 'RUNNING' })).toBe(false);
  });
});
