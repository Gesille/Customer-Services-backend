import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { feedbackAnalyticsService } from './feedback-analytics.service';
import { restaurantService } from './restaurant.service';

// ── Palette (mirrors the app's fuchsia/pink/purple ledger system) ──────────
const INK = '#0f172a';       // slate-900
const MUTED = '#64748b';     // slate-500
const FAINT = '#94a3b8';     // slate-400
const HAIRLINE = '#fae8ff';  // fuchsia-100
const TINT = '#fdf4ff';      // fuchsia-50
const FUCHSIA_700 = '#a21caf';
const GRADIENT_STOPS: [number, string][] = [
  [0, '#ec4899'],   // pink-500
  [0.5, '#c026d3'], // fuchsia-600
  [1, '#9333ea'],   // purple-600
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FONT_DIR = path.join(__dirname, '../assets/fonts');

class ReportPdfService {
  private fonts = {
    displayItalic: 'Times-Italic',
    displayMedium: 'Times-Bold',
    body: 'Helvetica',
    bodySemibold: 'Helvetica-Bold',
    mono: 'Courier',
    monoMedium: 'Courier-Bold',
  };

  private registerFonts(doc: PDFKit.PDFDocument) {
    const tryRegister = (name: string, file: string, fallback: string) => {
      const fullPath = path.join(FONT_DIR, file);
      if (fs.existsSync(fullPath)) {
        doc.registerFont(name, fullPath);
        return name;
      }
      return fallback;
    };

    this.fonts.displayItalic = tryRegister('Fraunces-Italic', 'Fraunces-Italic.ttf', 'Times-Italic');
    this.fonts.displayMedium = tryRegister('Fraunces-Medium', 'Fraunces-Medium.ttf', 'Times-Bold');
    this.fonts.body = tryRegister('Inter', 'Inter-Regular.ttf', 'Helvetica');
    this.fonts.bodySemibold = tryRegister('Inter-SemiBold', 'Inter-SemiBold.ttf', 'Helvetica-Bold');
    this.fonts.mono = tryRegister('IBMPlexMono', 'IBMPlexMono-Regular.ttf', 'Courier');
    this.fonts.monoMedium = tryRegister('IBMPlexMono-Medium', 'IBMPlexMono-Medium.ttf', 'Courier-Bold');
  }

  async streamRestaurantReport(
    res: Response,
    restaurantId: string,
    year: number,
    month: number,
  ): Promise<void> {
    const restaurant = await restaurantService.getById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const [overview, waiters, distribution, daily] = await Promise.all([
      feedbackAnalyticsService.getOverview(restaurantId),
      feedbackAnalyticsService.getWaiterPerformance(restaurantId),
      feedbackAnalyticsService.getRatingDistribution(restaurantId),
      feedbackAnalyticsService.getDailyReport(restaurantId, year, month),
    ]);

    const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const slug = restaurant.x_name.replace(/\s+/g, '-').toLowerCase();
    const filename = `${slug}-report-${year}-${String(month).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    this.registerFonts(doc);
    doc.pipe(res);

    this.drawHeader(doc, restaurant.x_name, restaurant.x_location, monthLabel);
    this.drawStatCards(doc, overview, daily);
    this.drawWaiterTable(doc, waiters);
    this.drawDistribution(doc, distribution);
    this.drawCalendar(doc, daily, year, month);

    doc.end();
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private gradientRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, radius = 0) {
    const grad = doc.linearGradient(x, y, x + w, y);
    GRADIENT_STOPS.forEach(([offset, color]) => grad.stop(offset, color));
    if (radius > 0) doc.roundedRect(x, y, w, h, radius);
    else doc.rect(x, y, w, h);
    doc.fill(grad);
  }

  private card(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
    doc.roundedRect(x, y, w, h, 10).fillColor('#ffffff').fill();
    doc.roundedRect(x, y, w, h, 10).strokeColor(HAIRLINE).lineWidth(1).stroke();
  }

  private ratingToTint(rating: number): string {
    // interpolate between fuchsia-50 and a stronger fuchsia based on 0–5 rating
    const t = Math.min(1, Math.max(0, rating / 5));
    const alpha = 0.08 + t * 0.22;
    return `rgba(192, 38, 211, ${alpha})`;
  }

  // ── Sections ───────────────────────────────────────────────────────────

  private drawHeader(doc: PDFKit.PDFDocument, name: string, location: string, monthLabel: string) {
    doc.font(this.fonts.monoMedium).fontSize(9).fillColor(FUCHSIA_700)
      .text('[ ANALYTICS ]', 50, 50, { characterSpacing: 1.2 });

    doc.font(this.fonts.displayItalic).fontSize(24).fillColor(INK)
      .text(name, 50, 68);

    if (location) {
      doc.font(this.fonts.body).fontSize(10).fillColor(MUTED)
        .text(location, 50, doc.y + 2);
    }

    doc.font(this.fonts.mono).fontSize(10).fillColor(INK)
      .text(`Feedback Report — ${monthLabel}`, 50, doc.y + 8);

    const barY = doc.y + 12;
    this.gradientRect(doc, 50, barY, 495, 3, 1.5);
    doc.y = barY + 20;
  }

  private drawStatCards(
    doc: PDFKit.PDFDocument,
    overview: Awaited<ReturnType<typeof feedbackAnalyticsService.getOverview>>,
    daily: Awaited<ReturnType<typeof feedbackAnalyticsService.getDailyReport>>,
  ) {
    const daysWithData = daily.filter((d) => d.feedbackCount > 0);
    const monthTotal = daily.reduce((s, d) => s + d.feedbackCount, 0);
    const monthAvg = daysWithData.length
      ? daysWithData.reduce((s, d) => s + d.averageOverallRating, 0) / daysWithData.length
      : 0;

    const stats = [
      { label: 'Total feedback', value: String(overview.totalFeedbacks) },
      { label: 'Avg overall', value: (overview.averages.overall_rating ?? 0).toFixed(1) },
      { label: 'This month', value: String(monthTotal) },
      { label: 'Month avg', value: monthTotal ? monthAvg.toFixed(1) : '—' },
    ];

    const gap = 10;
    const cardW = (495 - gap * 3) / 4;
    const cardH = 54;
    const y = doc.y;

    stats.forEach((s, i) => {
      const x = 50 + i * (cardW + gap);
      this.card(doc, x, y, cardW, cardH);
      this.gradientRect(doc, x + 10, y + 10, 20, 20, 5);
      doc.font(this.fonts.displayItalic).fontSize(16).fillColor(INK)
        .text(s.value, x + 10, y + 34, { width: cardW - 20 });
      doc.font(this.fonts.body).fontSize(7).fillColor(MUTED)
        .text(s.label, x + 10, y + 34 + 18, { width: cardW - 20 });
    });

    doc.y = y + cardH + 22;
  }

  private drawWaiterTable(
    doc: PDFKit.PDFDocument,
    waiters: Awaited<ReturnType<typeof feedbackAnalyticsService.getWaiterPerformance>>,
  ) {
    if (doc.y > 600) doc.addPage();

    doc.font(this.fonts.monoMedium).fontSize(9).fillColor(FUCHSIA_700)
      .text('[ WAITER PERFORMANCE ]', 50, doc.y, { characterSpacing: 1 });
    doc.moveDown(0.6);

    const colX = [60, 280, 370, 460];
    const rowH = 22;
    let y = doc.y;

    // header row
    doc.roundedRect(50, y, 495, rowH, 6).fillColor(TINT).fill();
    doc.font(this.fonts.monoMedium).fontSize(8).fillColor(MUTED);
    doc.text('WAITER', colX[0], y + 7);
    doc.text('FEEDBACK #', colX[1], y + 7);
    doc.text('OVERALL', colX[2], y + 7);
    doc.text('FRIENDLINESS', colX[3], y + 7);
    y += rowH;

    const rows = waiters.slice(0, 15);
    rows.forEach((w, i) => {
      if (y > 730) { doc.addPage(); y = 50; }
      if (i % 2 === 1) {
        doc.rect(50, y, 495, rowH).fillColor('#fdfbff').fill();
      }
      doc.font(this.fonts.body).fontSize(9).fillColor(INK);
      doc.text(w.waiter_name, colX[0], y + 6, { width: 210 });
      doc.font(this.fonts.mono).fillColor(MUTED);
      doc.text(String(w.feedbackCount), colX[1], y + 6);
      doc.text((w.averages.overall_rating ?? 0).toFixed(2), colX[2], y + 6);
      doc.text((w.averages.friendliness_rating ?? 0).toFixed(2), colX[3], y + 6);
      y += rowH;
    });

    doc.roundedRect(50, doc.y, 495, y - doc.y, 6).strokeColor(HAIRLINE).lineWidth(1).stroke();
    doc.y = y + 20;
  }

  private drawDistribution(
    doc: PDFKit.PDFDocument,
    distribution: Awaited<ReturnType<typeof feedbackAnalyticsService.getRatingDistribution>>,
  ) {
    const overall = distribution.find((d) => d.field === 'overall_rating');
    if (!overall) return;

    if (doc.y > 640) doc.addPage();

    doc.font(this.fonts.monoMedium).fontSize(9).fillColor(FUCHSIA_700)
      .text('[ OVERALL RATING DISTRIBUTION ]', 50, doc.y, { characterSpacing: 1 });
    doc.moveDown(0.8);

    const counts = Object.values(overall.distribution) as number[];
    const maxCount = Math.max(1, ...counts);
    const barMaxWidth = 380;
    const trackX = 100;

    for (const star of [5, 4, 3, 2, 1] as const) {
      const count = overall.distribution[star] ?? 0;
      const width = (count / maxCount) * barMaxWidth;
      const y = doc.y;

      doc.font(this.fonts.body).fontSize(9).fillColor(MUTED)
        .text(`${star} star`, 50, y + 2, { width: 42 });

      doc.roundedRect(trackX, y, barMaxWidth, 8, 4).fillColor(HAIRLINE).fill();
      if (width > 2) this.gradientRect(doc, trackX, y, width, 8, 4);

      doc.font(this.fonts.mono).fontSize(9).fillColor(MUTED)
        .text(String(count), trackX + barMaxWidth + 12, y + 2);

      doc.y = y + 16;
    }
    doc.y += 12;
  }

  private drawCalendar(
    doc: PDFKit.PDFDocument,
    daily: Awaited<ReturnType<typeof feedbackAnalyticsService.getDailyReport>>,
    year: number,
    month: number,
  ) {
    if (doc.y > 480) doc.addPage();

    doc.font(this.fonts.monoMedium).fontSize(9).fillColor(FUCHSIA_700)
      .text('[ DAILY BREAKDOWN ]', 50, doc.y, { characterSpacing: 1 });
    doc.moveDown(0.8);

    const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const cellGap = 4;
    const cellW = (495 - cellGap * 6) / 7;
    const cellH = 40;
    const startX = 50;

    const headerY = doc.y;
    doc.font(this.fonts.mono).fontSize(7).fillColor(FAINT);
    DAY_LABELS.forEach((label, i) =>
      doc.text(label.toUpperCase(), startX + i * (cellW + cellGap), headerY, { width: cellW, align: 'center' }),
    );

    let x = startX + startWeekday * (cellW + cellGap);
    let y = headerY + 14;

    for (const entry of daily) {
      const dayNum = Number(entry.date.split('-')[2]);
      const hasData = entry.feedbackCount > 0;

      doc.roundedRect(x, y, cellW, cellH, 4)
        .fillColor(hasData ? this.ratingToTint(entry.averageOverallRating) : '#fdfaff')
        .fill();
      doc.roundedRect(x, y, cellW, cellH, 4).strokeColor(HAIRLINE).lineWidth(0.75).stroke();

      doc.font(this.fonts.mono).fontSize(7).fillColor(FAINT)
        .text(String(dayNum), x + 5, y + 4);

      if (hasData) {
        doc.font(this.fonts.displayItalic).fontSize(9).fillColor(FUCHSIA_700)
          .text(entry.averageOverallRating.toFixed(1), x + 5, y + 20);
        doc.font(this.fonts.mono).fontSize(6).fillColor(MUTED)
          .text(`${entry.feedbackCount} fb`, x + 5, y + 30);
      } else {
        doc.font(this.fonts.mono).fontSize(7).fillColor('#d1c9d6')
          .text('—', x + 5, y + 20);
      }

      const weekday = (startWeekday + dayNum) % 7;
      if (weekday === 0) {
        x = startX;
        y += cellH + cellGap;
        if (y > 730) { doc.addPage(); y = 50; }
      } else {
        x += cellW + cellGap;
      }
    }
  }
}

export const reportPdfService = new ReportPdfService();