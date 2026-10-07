import { ScrapeProgressCardComponent } from './scrape-progress-card.component';

/**
 * `__areHiddenPassesDone`: the passes the send gate waits for that have no step on the card.
 * Called off the prototype: it reads only `scrapeEstimate` and the campaign it is given.
 */
describe('ScrapeProgressCardComponent.__areHiddenPassesDone', () => {
  const done = (campaign: any, passes: string[] = ['web', 'map', 'linkedin']) =>
    (ScrapeProgressCardComponent.prototype as any).__areHiddenPassesDone.call(
      { scrapeEstimate: { passes: passes.map(pass => ({ pass })) } },
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
