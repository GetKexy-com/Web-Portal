import type { jsPDF } from 'jspdf';

import {
  ICampaignAnalyticsContact,
  ICampaignAnalyticsLink,
  ICampaignAnalyticsTrendPoint,
  ICampaignScoreBands,
} from '../models/CampaignAnalytics';

/**
 * The Insights drawer as a PDF report: header, KPI cards, activity chart, funnel, top
 * links and the tables — the same figures the drawer shows, already derived by it.
 *
 * Everything is drawn as VECTOR with jsPDF (no screenshot of the DOM): text stays
 * selectable and sharp at any zoom, and the file is a few tens of KB. jsPDF is loaded
 * with a dynamic `import()` so it only ships to people who press Export → PDF.
 *
 * The built-in Helvetica only covers Windows-1252, so text is cleaned through `__clean`
 * (an emoji in a subject line would otherwise print as garbage).
 */

export interface ICampaignInsightsPdfReport {
  /** "Campaign Insights" or "Email Insights". */
  scopeLabel: string;
  campaignTitle: string;
  /** Line under the title: status/emails for a campaign, "Email #n · subject" for one. */
  eyebrow: string;
  from: string;
  to: string;
  days: number;
  sent: number;
  sentDelta: number | null;
  reach: { prospects: number; opened: number; clicked: number; replied: number };
  openRate: number;
  clickRate: number;
  replyRate: number;
  trend: ICampaignAnalyticsTrendPoint[];
  funnel: { label: string; value: number; pct: number; stepPct: number | null }[];
  topLinks: ICampaignAnalyticsLink[];
  /** Empty at email scope — the table is then left out. */
  perEmail: {
    sequence: number;
    subject: string;
    sent: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  }[];
  contacts: ICampaignAnalyticsContact[];
  /** Which ranking `contacts` is: 'opens' | 'clicks' | 'replies'. */
  contactsRankedBy: string;
  /**
   * Email scope: where this email's prospects stand right now (the Prospects summary).
   * A snapshot, unlike every other figure, so it carries its own time.
   */
  sendStatus?: {
    asOf: Date;
    total: number;
    sent: number;
    inProgress: number;
    queued: number;
    scheduled: number;
    failed: number;
    stopped: number;
    skipped: number;
  } | null;
  /** Campaign prospects by saved-score band; absent from an older API. */
  scoreBands?: ICampaignScoreBands | null;
}

type RGB = [number, number, number];

// Same tokens as `_insights-drawer.scss`, so the report reads as the drawer printed.
const C = {
  navy: [11, 63, 150] as RGB,
  deep: [9, 93, 209] as RGB,
  primary: [18, 165, 244] as RGB,
  pale: [124, 201, 248] as RGB,
  sky: [88, 186, 247] as RGB,
  bright: [52, 136, 236] as RGB,
  mint: [16, 163, 107] as RGB,
  ink: [15, 23, 42] as RGB,
  muted: [100, 116, 139] as RGB,
  faint: [148, 163, 184] as RGB,
  border: [226, 232, 240] as RGB,
  hairline: [241, 245, 249] as RGB,
  field: [247, 249, 252] as RGB,
  good: [4, 120, 87] as RGB,
  red: [220, 38, 38] as RGB,
  amber: [245, 158, 11] as RGB,
  white: [255, 255, 255] as RGB,
};

const SERIES: { key: keyof Omit<ICampaignAnalyticsTrendPoint, 'date'>; label: string; color: RGB }[] = [
  { key: 'sent', label: 'Sent', color: C.deep },
  { key: 'opens', label: 'Opens', color: C.primary },
  { key: 'clicks', label: 'Clicks', color: C.amber },
  { key: 'replies', label: 'Replies', color: C.mint },
];

const FUNNEL_COLORS: RGB[] = [C.deep, C.primary, C.sky, C.pale];

/** The Score API's bands, strongest first. */
const BAND_META: { key: 'strong' | 'good' | 'fair' | 'weak'; label: string; color: RGB }[] = [
  { key: 'strong', label: 'Strong', color: C.mint },
  { key: 'good', label: 'Good', color: C.primary },
  { key: 'fair', label: 'Fair', color: C.amber },
  { key: 'weak', label: 'Weak', color: C.faint },
];

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 36;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_H = 30;

/** White wordmark, the one on the login page — drawn on the blue header band. */
const LOGO_URL = 'assets/images/kexy-white-logo.png';
/** The PNG's own proportions (347 × 196), so the mark is never stretched. */
const LOGO_RATIO = 347 / 196;

export async function downloadCampaignInsightsPdf(
  report: ICampaignInsightsPdfReport,
  fileName: string,
): Promise<void> {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  new InsightsPdf(doc, report, logo).render();
  doc.save(fileName);
}

/** The logo as a data URL, or null — a missing logo must never stop the export. */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

class InsightsPdf {
  private y = 0;

  constructor(
    private doc: jsPDF,
    private r: ICampaignInsightsPdfReport,
    private logo: string | null = null,
  ) {}

  render(): void {
    this.__header();
    this.__kpis();
    if (this.r.sendStatus) this.__sendStatus();
    else if (this.r.scoreBands?.scored) this.__scoreCard();
    this.__chart();
    this.__funnelAndLinks();
    if (this.r.perEmail.length) this.__perEmail();
    this.__contacts();
    this.__footers();
  }

  // ── Sections ────────────────────────────────────────────────────────────

  private __header(): void {
    const d = this.doc;
    const h = 112;
    this.__fill(C.deep);
    d.rect(0, 0, PAGE_W, h, 'F');
    // A lighter slab on the right gives the band depth without an image.
    this.__fill(C.bright);
    d.triangle(PAGE_W * 0.55, h, PAGE_W, 0, PAGE_W, h, 'F');
    this.__fill(C.primary);
    d.rect(0, h, PAGE_W, 3, 'F');

    this.__text(this.r.scopeLabel.toUpperCase(), M, 34, 9, 'bold', [200, 230, 255], { charSpace: 1.2 });
    this.__text(this.__fit(this.r.campaignTitle || 'Campaign', CONTENT_W - 150, 22, 'bold'), M, 62, 22, 'bold', C.white);
    this.__text(this.__fit(this.r.eyebrow, CONTENT_W - 150, 10), M, 82, 10, 'normal', [210, 225, 250]);

    const right = PAGE_W - M;
    this.__logo(right, 18, 30);
    this.__text(`Last ${this.r.days} days`, right, 66, 9, 'bold', C.white, { align: 'right' });
    this.__text(`${this.__date(this.r.from)} – ${this.__date(this.r.to)}`, right, 79, 9, 'normal', [210, 225, 250], { align: 'right' });
    this.__text(
      `Generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      right,
      94,
      8,
      'normal',
      [190, 210, 245],
      { align: 'right' },
    );
    this.y = h + 26;
  }

  private __kpis(): void {
    const gap = 10;
    const w = (CONTENT_W - gap * 3) / 4;
    const h = 74;
    const r = this.r.reach;
    const delta =
      this.r.sentDelta === null
        ? { text: 'no prior period', color: C.faint }
        : this.r.sentDelta === 0
          ? { text: 'no change vs previous', color: C.muted }
          : {
              text: `${this.r.sentDelta > 0 ? '+' : ''}${this.r.sentDelta}% vs previous`,
              color: this.r.sentDelta > 0 ? C.good : C.red,
            };

    const cards = [
      { label: 'Sent', value: this.__num(this.r.sent), sub: delta.text, subColor: delta.color, accent: C.deep, pct: null },
      { label: 'Open rate', value: `${this.r.openRate}%`, sub: `${this.__num(r.opened)} of ${this.__num(r.prospects)} prospects`, subColor: C.muted, accent: C.primary, pct: this.r.openRate },
      { label: 'Click rate', value: `${this.r.clickRate}%`, sub: `${this.__num(r.clicked)} of ${this.__num(r.prospects)} prospects`, subColor: C.muted, accent: C.amber, pct: this.r.clickRate },
      { label: 'Reply rate', value: `${this.r.replyRate}%`, sub: `${this.__num(r.replied)} of ${this.__num(r.prospects)} prospects`, subColor: C.muted, accent: C.mint, pct: this.r.replyRate },
    ];

    cards.forEach((c, i) => {
      const x = M + i * (w + gap);
      this.__card(x, this.y, w, h);
      this.__fill(c.accent);
      this.doc.roundedRect(x + 12, this.y + 13, 3, 10, 1.5, 1.5, 'F');
      this.__text(c.label.toUpperCase(), x + 20, this.y + 21, 7.5, 'bold', C.muted, { charSpace: 0.6 });
      this.__text(c.value, x + 12, this.y + 47, 20, 'bold', C.ink);
      this.__text(this.__fit(c.sub, w - 24, 7.5), x + 12, this.y + 62, 7.5, 'normal', c.subColor);
      if (c.pct !== null) {
        // A thin meter along the card's foot: the rate as a share of 100%.
        const bw = w - 24;
        this.__fill(C.hairline);
        this.doc.roundedRect(x + 12, this.y + h - 7, bw, 2.5, 1.25, 1.25, 'F');
        if (c.pct > 0) {
          this.__fill(c.accent);
          this.doc.roundedRect(x + 12, this.y + h - 7, Math.max(2.5, (bw * Math.min(c.pct, 100)) / 100), 2.5, 1.25, 1.25, 'F');
        }
      }
    });
    this.y += h + 16;
  }

  /**
   * Email scope: the Prospects summary as one stacked bar with counts, then the score
   * bands. Labelled with its time, because unlike the rest of the report it is not
   * the selected range but where things stand now.
   */
  private __sendStatus(): void {
    const d = this.doc;
    const st = this.r.sendStatus;
    const bands = this.r.scoreBands;
    const h = bands?.scored ? 128 : 92;
    this.__ensure(h);
    const top = this.y;
    this.__card(M, top, CONTENT_W, h);
    this.__panelTitle('Send status', M + 16, top + 24);
    this.__text(
      `as of ${st.asOf.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
      M + CONTENT_W - 16,
      top + 24,
      7.5,
      'normal',
      C.faint,
      { align: 'right' },
    );

    const segments = [
      { label: 'Sent', count: st.sent, color: C.deep },
      { label: 'In progress', count: st.inProgress, color: C.primary },
      { label: 'Queued', count: st.queued, color: C.sky },
      { label: 'Scheduled', count: st.scheduled, color: C.pale },
      { label: 'Failed', count: st.failed, color: C.red },
      { label: 'Stopped', count: st.stopped, color: [153, 27, 27] as RGB },
      { label: 'Skipped', count: st.skipped, color: C.faint },
    ];
    this.__text(
      st.total ? `${this.__num(st.sent)} of ${this.__num(st.total)} prospects sent` : 'No prospects enrolled yet',
      M + 16,
      top + 42,
      9,
      'bold',
      C.ink,
    );
    this.__stackedBar(M + 16, top + 50, CONTENT_W - 32, segments, st.total);
    this.__legend(M + 16, top + 76, segments.filter((s) => s.count > 0));

    if (bands?.scored) {
      this.__stroke(C.hairline);
      d.setLineWidth(0.6);
      d.line(M + 16, top + 90, M + CONTENT_W - 16, top + 90);
      this.__scoreRow(M + 16, top + 108, CONTENT_W - 32, bands);
    }
    this.y = top + h + 16;
  }

  /** Campaign scope: the score bands on their own, as a slim card. */
  private __scoreCard(): void {
    const h = 48;
    this.__ensure(h);
    this.__card(M, this.y, CONTENT_W, h);
    this.__scoreRow(M + 16, this.y + 28, CONTENT_W - 32, this.r.scoreBands);
    this.y += h + 16;
  }

  /** "Prospect scores · 38 scored" then a pill per band. Saved scores only. */
  private __scoreRow(x: number, y: number, w: number, bands: ICampaignScoreBands): void {
    const d = this.doc;
    this.__text('Prospect scores', x, y, 9.5, 'bold', C.ink);
    d.setFont('helvetica', 'bold').setFontSize(9.5);
    const tx = x + d.getTextWidth('Prospect scores') + 8;
    this.__text(`${this.__num(bands.scored)} scored in this campaign`, tx, y, 8, 'normal', C.muted);

    // Pills, right-aligned.
    let px = x + w;
    [...BAND_META].reverse().forEach((b) => {
      const label = `${b.label} ${this.__num(bands[b.key])}`;
      d.setFont('helvetica', 'bold').setFontSize(8);
      const pw = d.getTextWidth(label) + 22;
      px -= pw;
      this.__fill(C.field);
      this.__stroke(C.border);
      d.setLineWidth(0.6);
      d.roundedRect(px, y - 10, pw, 15, 7.5, 7.5, 'FD');
      this.__fill(b.color);
      d.circle(px + 9, y - 2.5, 2.6, 'F');
      this.__text(label, px + 15, y + 0.5, 8, 'bold', bands[b.key] ? C.ink : C.faint);
      px -= 6;
    });
  }

  private __stackedBar(
    x: number,
    y: number,
    w: number,
    segments: { count: number; color: RGB }[],
    total: number,
  ): void {
    const d = this.doc;
    const h = 10;
    this.__fill(C.hairline);
    d.roundedRect(x, y, w, h, 5, 5, 'F');
    if (!total) return;
    // Clip-free rounding: draw square segments, then round only the outer ends.
    let cx = x;
    const shown = segments.filter((s) => s.count > 0);
    shown.forEach((s, i) => {
      const sw = (w * s.count) / total;
      this.__fill(s.color);
      if (shown.length === 1) d.roundedRect(cx, y, sw, h, 5, 5, 'F');
      else if (i === 0) {
        d.roundedRect(cx, y, Math.min(sw, 10), h, 5, 5, 'F');
        d.rect(cx + Math.min(sw, 5), y, Math.max(sw - 5, 0), h, 'F');
      } else if (i === shown.length - 1) {
        d.rect(cx, y, Math.max(sw - 5, 0), h, 'F');
        d.roundedRect(cx + Math.max(sw - 10, 0), y, Math.min(sw, 10), h, 5, 5, 'F');
      } else d.rect(cx, y, sw, h, 'F');
      cx += sw;
    });
  }

  private __legend(x: number, y: number, items: { label: string; count: number; color: RGB }[]): void {
    const d = this.doc;
    let lx = x;
    items.forEach((it) => {
      this.__fill(it.color);
      d.roundedRect(lx, y - 6.5, 7, 7, 2, 2, 'F');
      this.__text(it.label, lx + 11, y, 8, 'normal', C.muted);
      d.setFont('helvetica', 'normal').setFontSize(8);
      const lw = d.getTextWidth(it.label);
      this.__text(this.__num(it.count), lx + 14 + lw, y, 8, 'bold', C.ink);
      d.setFont('helvetica', 'bold').setFontSize(8);
      lx += 14 + lw + d.getTextWidth(this.__num(it.count)) + 16;
    });
  }

  private __chart(): void {
    const d = this.doc;
    const h = 210;
    this.__ensure(h);
    const top = this.y;
    this.__card(M, top, CONTENT_W, h);
    this.__panelTitle('Activity over time', M + 16, top + 24);

    // Legend, right-aligned in the title row.
    let lx = M + CONTENT_W - 16;
    [...SERIES].reverse().forEach((s) => {
      d.setFont('helvetica', 'normal').setFontSize(8);
      const tw = d.getTextWidth(s.label);
      lx -= tw;
      this.__text(s.label, lx, top + 24, 8, 'normal', C.muted);
      lx -= 12;
      this.__fill(s.color);
      d.roundedRect(lx, top + 18.5, 8, 8, 2, 2, 'F');
      lx -= 14;
    });

    const series = this.r.trend;
    const px = M + 46;
    const pw = CONTENT_W - 46 - 18;
    const py = top + 44;
    const ph = h - 44 - 34;

    if (!series.length || !this.r.sent) {
      this.__text('Nothing was sent in this window.', M + CONTENT_W / 2, py + ph / 2, 10, 'normal', C.faint, { align: 'center' });
      this.y = top + h + 16;
      return;
    }

    const peak = this.__niceMax(Math.max(0, ...series.flatMap((p) => SERIES.map((s) => p[s.key]))));
    const span = series.length > 1 ? series.length - 1 : 1;
    const xAt = (i: number) => px + (i / span) * pw;
    const yAt = (v: number) => py + ph - (v / peak) * ph;

    // Grid + y labels.
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const gy = py + ph - f * ph;
      this.__stroke(f === 0 ? C.border : C.hairline);
      d.setLineWidth(f === 0 ? 0.8 : 0.6);
      d.line(px, gy, px + pw, gy);
      this.__text(this.__compact(Math.round(peak * f)), px - 8, gy + 3, 7.5, 'normal', C.faint, { align: 'right' });
    });

    // X labels: first, quarters, last — enough to read a date off, never crowded.
    const marks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * span)))].filter(
      (i) => i < series.length,
    );
    marks.forEach((i, n) => {
      const align = n === 0 ? 'left' : n === marks.length - 1 ? 'right' : 'center';
      this.__text(this.__date(series[i].date), xAt(i), py + ph + 14, 7.5, 'normal', C.faint, { align });
    });

    // Soft area under Sent — the volume the other lines are measured against.
    const sentPts = series.map((p, i) => [xAt(i), yAt(p.sent)] as [number, number]);
    this.__withOpacity(0.1, () => {
      this.__fill(C.deep);
      this.__polygon([[px, py + ph], ...sentPts, [xAt(series.length - 1), py + ph]]);
    });

    // Lines, Sent last so it sits on top.
    [...SERIES.slice(1), SERIES[0]].forEach((s) => {
      const pts = series.map((p, i) => [xAt(i), yAt(p[s.key])] as [number, number]);
      this.__stroke(s.color);
      d.setLineWidth(s.key === 'sent' ? 1.8 : 1.4);
      d.setLineJoin('round').setLineCap('round');
      this.__polyline(pts);
      if (series.length <= 31) {
        this.__fill(C.white);
        pts.forEach(([x, y]) => d.circle(x, y, 1.6, 'FD'));
      }
    });
    d.setLineCap('butt');
    this.y = top + h + 16;
  }

  private __funnelAndLinks(): void {
    const d = this.doc;
    const gap = 12;
    const w = (CONTENT_W - gap) / 2;
    const links = this.r.topLinks.slice(0, 6);
    const h = Math.max(190, 64 + links.length * 22);
    this.__ensure(h);
    const top = this.y;

    // ── Funnel ──
    this.__card(M, top, w, h);
    this.__panelTitle('Engagement funnel', M + 16, top + 24);
    this.__text('unique prospects · step conversion', M + 16, top + 37, 7.5, 'normal', C.faint);
    const fx = M + 16;
    const fw = w - 32;
    const rowH = (h - 58) / Math.max(this.r.funnel.length, 1);
    this.r.funnel.forEach((s, i) => {
      const ry = top + 52 + i * rowH;
      this.__text(s.label, fx, ry + 10, 8.5, 'bold', C.ink);
      this.__text(this.__num(s.value), fx + fw - 40, ry + 10, 8.5, 'bold', C.ink, { align: 'right' });
      this.__text(s.stepPct === null ? '—' : `${s.stepPct}%`, fx + fw, ry + 10, 8, 'normal', C.muted, { align: 'right' });
      // Bars are centred so the funnel actually narrows, like the shape it is named for.
      const barY = ry + 16;
      this.__fill(C.hairline);
      d.roundedRect(fx, barY, fw, 9, 4.5, 4.5, 'F');
      const bw = Math.max(s.value ? 9 : 0, (fw * Math.min(s.pct, 100)) / 100);
      if (bw > 0) {
        this.__fill(FUNNEL_COLORS[i] || C.primary);
        d.roundedRect(fx + (fw - bw) / 2, barY, bw, 9, 4.5, 4.5, 'F');
      }
    });

    // ── Top links ──
    const lx0 = M + w + gap;
    this.__card(lx0, top, w, h);
    this.__panelTitle('Top clicked links', lx0 + 16, top + 24);
    this.__text('clicks per link', lx0 + 16, top + 37, 7.5, 'normal', C.faint);
    if (!links.length) {
      this.__text('No link clicks in this window.', lx0 + w / 2, top + h / 2 + 6, 9, 'normal', C.faint, { align: 'center' });
    } else {
      const peak = Math.max(...links.map((l) => l.count), 1);
      const lw = w - 32;
      links.forEach((l, i) => {
        const ry = top + 52 + i * 22;
        this.__text(this.__fit(this.__prettyUrl(l.key), lw - 40, 8), lx0 + 16, ry + 8, 8, 'normal', C.ink);
        this.__text(this.__num(l.count), lx0 + 16 + lw, ry + 8, 8.5, 'bold', C.ink, { align: 'right' });
        this.__fill(C.hairline);
        d.roundedRect(lx0 + 16, ry + 12, lw, 4, 2, 2, 'F');
        this.__fill(C.primary);
        d.roundedRect(lx0 + 16, ry + 12, Math.max(4, (lw * l.count) / peak), 4, 2, 2, 'F');
      });
    }
    this.y = top + h + 16;
  }

  private __perEmail(): void {
    this.__table({
      title: 'Performance by email',
      note: "rates are share of that email's unique prospects",
      columns: [
        { label: '#', width: 26, align: 'left', muted: true },
        { label: 'Subject', width: 0, align: 'left', bold: true },
        { label: 'Sent', width: 62, align: 'center' },
        { label: 'Open', width: 80, align: 'center', bar: C.primary },
        { label: 'Click', width: 80, align: 'center', bar: C.amber },
        { label: 'Reply', width: 80, align: 'right', bar: C.mint, bold: true },
      ],
      rows: this.r.perEmail.map((e) => ({
        dim: !e.sent,
        cells: [
          String(e.sequence),
          e.subject || '(no subject)',
          this.__num(e.sent),
          e.sent ? { text: `${e.openRate}%`, pct: e.openRate } : '—',
          e.sent ? { text: `${e.clickRate}%`, pct: e.clickRate } : '—',
          e.sent ? { text: `${e.replyRate}%`, pct: e.replyRate } : '—',
        ],
      })),
      empty: 'This campaign has no emails yet.',
    });
  }

  private __contacts(): void {
    const ranked = this.r.contactsRankedBy;
    this.__table({
      title: 'Most engaged contacts',
      note: `ranked by ${ranked}`,
      columns: [
        { label: '#', width: 26, align: 'left', muted: true },
        { label: 'Contact', width: 0, align: 'left', bold: true },
        { label: 'Opens', width: 50, align: 'center', bold: ranked === 'opens' },
        { label: 'Clicks', width: 50, align: 'center', bold: ranked === 'clicks' },
        { label: 'Replies', width: 50, align: 'center', bold: ranked === 'replies' },
        { label: 'Score', width: 76, align: 'center' },
        { label: 'Last seen', width: 58, align: 'right', muted: true },
      ],
      rows: this.r.contacts.map((c, i) => ({
        cells: [
          String(i + 1),
          { text: c.name || c.email, sub: [c.jobTitle, c.companyName].filter(Boolean).join(' · ') || (c.name ? c.email : '') },
          this.__num(c.opens),
          this.__num(c.clicks),
          this.__num(c.replies),
          c.score ? { text: `${c.score.value}`, band: c.score.band } : '—',
          c.lastActivity ? this.__date(c.lastActivity) : '—',
        ],
      })),
      empty: `No ${ranked} recorded in this window.`,
    });
  }

  // ── Table ───────────────────────────────────────────────────────────────

  /**
   * A card-framed table that breaks across pages: when a row would cross the footer
   * the card is closed, a page added, and the header row repeated.
   */
  private __table(t: {
    title: string;
    note: string;
    columns: { label: string; width: number; align: 'left' | 'center' | 'right'; bold?: boolean; muted?: boolean; bar?: RGB }[];
    rows: { dim?: boolean; cells: (string | { text: string; pct?: number; sub?: string; band?: string })[] }[];
    empty: string;
  }): void {
    const d = this.doc;
    const pad = 16;
    const headH = 46;
    const colHeadH = 20;
    const hasSub = t.rows.some((r) => r.cells.some((c) => typeof c === 'object' && c.sub));
    const rowH = hasSub ? 30 : 24;
    const fixed = t.columns.reduce((s, c) => s + c.width, 0);
    const widths = t.columns.map((c) => c.width || CONTENT_W - pad * 2 - fixed);

    // A table that would split here but fits whole on a fresh page moves there, so a
    // five-row table is never left as three rows and a "(continued)" stub.
    const fullH = headH - 10 + colHeadH + Math.max(t.rows.length, 1) * rowH + 6;
    if (this.y + fullH > PAGE_H - FOOTER_H - 12 && 56 + fullH <= PAGE_H - FOOTER_H - 12) {
      this.__newPage();
    }

    let cardTop = 0;
    const openCard = (first: boolean) => {
      this.__ensure(headH + colHeadH + rowH + 8);
      cardTop = this.y;
      if (first) {
        this.__panelTitle(t.title, M + pad, cardTop + 24);
        this.__text(t.note, M + CONTENT_W - pad, cardTop + 24, 7.5, 'normal', C.faint, { align: 'right' });
        this.y = cardTop + headH - 10;
      } else {
        this.__text(`${t.title} (continued)`, M + pad, cardTop + 20, 9, 'bold', C.muted);
        this.y = cardTop + 30;
      }
      // Column header band.
      this.__fill(C.field);
      d.rect(M + 1, this.y, CONTENT_W - 2, colHeadH, 'F');
      let x = M + pad;
      t.columns.forEach((c, i) => {
        this.__text(c.label.toUpperCase(), this.__alignX(x, widths[i], c.align), this.y + 13, 7, 'bold', C.faint, {
          align: c.align,
          charSpace: 0.5,
        });
        x += widths[i];
      });
      this.y += colHeadH;
    };
    const closeCard = () => {
      this.__stroke(C.border);
      d.setLineWidth(0.8);
      d.roundedRect(M, cardTop, CONTENT_W, this.y + 6 - cardTop, 8, 8, 'S');
      this.y += 6 + 16;
    };

    openCard(true);
    if (!t.rows.length) {
      this.__text(t.empty, M + CONTENT_W / 2, this.y + 22, 9, 'normal', C.faint, { align: 'center' });
      this.y += 36;
      closeCard();
      return;
    }

    t.rows.forEach((row, ri) => {
      if (this.y + rowH > PAGE_H - FOOTER_H - 12) {
        closeCard();
        this.__newPage();
        openCard(false);
      }
      if (ri % 2 === 1) {
        this.__fill([250, 251, 253]);
        d.rect(M + 1, this.y, CONTENT_W - 2, rowH, 'F');
      }
      const mid = this.y + rowH / 2;
      let x = M + pad;
      row.cells.forEach((cell, i) => {
        const col = t.columns[i];
        const w = widths[i];
        const text = typeof cell === 'string' ? cell : cell.text;
        const color: RGB = row.dim || text === '—' ? C.faint : col.muted ? C.muted : C.ink;
        const weight = col.bold && !row.dim ? 'bold' : 'normal';
        const sub = typeof cell === 'object' ? cell.sub : '';
        const pct = typeof cell === 'object' ? cell.pct : undefined;
        const band = typeof cell === 'object' ? cell.band : undefined;

        if (band !== undefined) {
          // Score as a pill: the number, then the band in its colour.
          const meta = BAND_META.find((b) => b.key === band);
          const label = meta ? `${text} · ${meta.label}` : text;
          d.setFont('helvetica', 'bold').setFontSize(8);
          const pw = d.getTextWidth(label) + 18;
          const px = x + (w - pw) / 2;
          this.__fill(C.field);
          this.__stroke(C.border);
          d.setLineWidth(0.6);
          d.roundedRect(px, mid - 7, pw, 14, 7, 7, 'FD');
          this.__fill(meta?.color ?? C.faint);
          d.circle(px + 8, mid, 2.4, 'F');
          this.__text(label, px + 13, mid + 2.8, 8, 'bold', C.ink);
        } else if (col.bar && pct !== undefined) {
          // Rate with a mini bar under it, so a column can be scanned for its outlier.
          this.__text(text, this.__alignX(x, w, col.align), mid - 1, 8.5, weight, color, { align: col.align });
          const bw = 44;
          const bx = col.align === 'right' ? x + w - bw : col.align === 'center' ? x + (w - bw) / 2 : x;
          this.__fill(C.hairline);
          d.roundedRect(bx, mid + 4, bw, 3, 1.5, 1.5, 'F');
          if (pct > 0) {
            this.__fill(col.bar);
            d.roundedRect(bx, mid + 4, Math.max(3, (bw * Math.min(pct, 100)) / 100), 3, 1.5, 1.5, 'F');
          }
        } else if (sub) {
          this.__text(this.__fit(text, w - 8, 8.5, weight), x, mid - 2, 8.5, weight, color);
          this.__text(this.__fit(sub, w - 8, 7), x, mid + 9, 7, 'normal', C.faint);
        } else {
          const fitted = col.align === 'left' ? this.__fit(text, w - 8, 8.5, weight) : text;
          this.__text(fitted, this.__alignX(x, w, col.align), mid + 3, 8.5, weight, color, { align: col.align });
        }
        x += w;
      });
      this.y += rowH;
      if (ri < t.rows.length - 1) {
        this.__stroke(C.hairline);
        d.setLineWidth(0.6);
        d.line(M + pad, this.y, M + CONTENT_W - pad, this.y);
      }
    });
    closeCard();
  }

  // ── Page furniture ──────────────────────────────────────────────────────

  private __ensure(h: number): void {
    if (this.y + h > PAGE_H - FOOTER_H - 8) this.__newPage();
  }

  /** Continuation pages get a slim band instead of the full header. */
  private __newPage(): void {
    const d = this.doc;
    d.addPage();
    this.__fill(C.deep);
    d.rect(0, 0, PAGE_W, 34, 'F');
    this.__fill(C.primary);
    d.rect(0, 34, PAGE_W, 2, 'F');
    this.__text(this.__fit(this.r.campaignTitle, CONTENT_W - 160, 10, 'bold'), M, 21, 10, 'bold', C.white);
    if (this.logo) this.__logo(PAGE_W - M, 9, 17);
    else this.__text(this.r.scopeLabel, PAGE_W - M, 21, 8, 'normal', [200, 230, 255], { align: 'right' });
    this.y = 56;
  }

  private __footers(): void {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      d.setPage(p);
      const fy = PAGE_H - 18;
      this.__stroke(C.border);
      d.setLineWidth(0.6);
      d.line(M, fy - 10, PAGE_W - M, fy - 10);
      this.__text('Kexy · Campaign insights report', M, fy, 7.5, 'normal', C.faint);
      this.__text(`Page ${p} of ${pages}`, PAGE_W - M, fy, 7.5, 'normal', C.faint, { align: 'right' });
    }
  }

  /** The wordmark, right-aligned to `right`, `h` tall. Nothing if it failed to load. */
  private __logo(right: number, top: number, h: number): void {
    if (!this.logo) return;
    const w = h * LOGO_RATIO;
    this.doc.addImage(this.logo, 'PNG', right - w, top, w, h, 'kexy-logo', 'FAST');
  }

  private __card(x: number, y: number, w: number, h: number): void {
    this.__fill(C.white);
    this.__stroke(C.border);
    this.doc.setLineWidth(0.8);
    this.doc.roundedRect(x, y, w, h, 8, 8, 'FD');
  }

  private __panelTitle(title: string, x: number, y: number): void {
    this.__text(title, x, y, 11, 'bold', C.ink);
  }

  // ── Drawing primitives ─────────────────────────────────────────────────

  private __text(
    text: string,
    x: number,
    y: number,
    size: number,
    weight: 'normal' | 'bold',
    color: RGB,
    opts: { align?: 'left' | 'center' | 'right'; charSpace?: number } = {},
  ): void {
    const d = this.doc;
    d.setFont('helvetica', weight).setFontSize(size).setTextColor(...color);
    d.text(this.__clean(text), x, y, { align: opts.align || 'left', charSpace: opts.charSpace || 0 });
  }

  private __alignX(x: number, w: number, align: 'left' | 'center' | 'right'): number {
    return align === 'right' ? x + w : align === 'center' ? x + w / 2 : x;
  }

  private __fill(c: RGB): void {
    this.doc.setFillColor(...c);
  }

  private __stroke(c: RGB): void {
    this.doc.setDrawColor(...c);
  }

  private __polyline(pts: [number, number][]): void {
    if (pts.length < 2) return;
    const [x0, y0] = pts[0];
    const rel = pts.slice(1).map(([x, y], i) => [x - pts[i][0], y - pts[i][1]]);
    this.doc.lines(rel, x0, y0, [1, 1], 'S', false);
  }

  private __polygon(pts: [number, number][]): void {
    const [x0, y0] = pts[0];
    const rel = pts.slice(1).map(([x, y], i) => [x - pts[i][0], y - pts[i][1]]);
    this.doc.lines(rel, x0, y0, [1, 1], 'F', true);
  }

  private __withOpacity(opacity: number, draw: () => void): void {
    const d = this.doc as any;
    d.saveGraphicsState();
    d.setGState(new d.GState({ opacity }));
    draw();
    d.restoreGraphicsState();
  }

  // ── Text helpers ────────────────────────────────────────────────────────

  /** Truncates with an ellipsis to fit `maxW` at the given font. */
  private __fit(text: string, maxW: number, size: number, weight: 'normal' | 'bold' = 'normal'): string {
    const d = this.doc;
    d.setFont('helvetica', weight).setFontSize(size);
    let s = this.__clean(text || '');
    if (d.getTextWidth(s) <= maxW) return s;
    while (s.length > 1 && d.getTextWidth(s + '…') > maxW) s = s.slice(0, -1);
    return s.trimEnd() + '…';
  }

  /** Helvetica in jsPDF is Windows-1252 only; drop what it cannot draw. */
  private __clean(text: string): string {
    return (text || '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^\x20-\x7E\xA0-\xFF–—•…·€™]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private __prettyUrl(url: string): string {
    return (url || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  }

  private __num(n: number): string {
    return (n || 0).toLocaleString('en-US');
  }

  private __compact(value: number): string {
    if (value >= 1000000) return `${Math.round(value / 100000) / 10}M`;
    if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
    return `${value}`;
  }

  /**
   * The axis max: four equal steps of a round size (1, 2, 2.5 or 5 × 10ⁿ), so every
   * quarter grid line is labelled with a clean number rather than 17.5 or 53.
   */
  private __niceMax(peak: number): number {
    if (peak <= 4) return 4;
    const raw = peak / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= raw) as number;
    return Math.max(4, Math.ceil(step) * 4);
  }

  /** `YYYY-MM-DD` (or a full ISO stamp) as "Aug 10", parsed as a LOCAL date. */
  private __date(iso: string): string {
    if (!iso) return '';
    // A timestamp is a real instant: show it in the reader's zone.
    if (iso.includes('T')) {
      const at = new Date(iso);
      if (!isNaN(at.getTime())) return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    if (!y) return iso;
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
