import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { feedbackAnalyticsService } from './feedback-analytics.service';
import { restaurantService } from './restaurant.service';

// ── Palette (navy/gold — matches the NextIntl brand system) ────────────────
const NAVY = '#131B2E';
const GOLD = '#C9A227';
const MUTED = '#5B6472';
const FAINT = '#9CA0AC';
const HAIRLINE = '#E2E4E9';
const TINT = '#F7F5EE';       // warm cream, used for header rows / zebra stripes
const GOLD_TRACK = '#F0E9D2'; // pale gold track for bars

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

  private card(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
    doc.roundedRect(x, y, w, h, 6).fillColor('#ffffff').fill();
    doc.roundedRect(x, y, w, h, 6).strokeColor(HAIRLINE).lineWidth(1).stroke();
  }

  private eyebrow(doc: PDFKit.PDFDocument, text: string, y: number) {
    doc.font(this.fonts.monoMedium).fontSize(8).fillColor(GOLD)
      .text(text, 50, y, { characterSpacing: 1.4 });
  }

  private ratingOpacity(rating: number): number {
    return 0.08 + Math.min(1, Math.max(0, rating / 5)) * 0.28;
  }

  // ── Sections ───────────────────────────────────────────────────────────

  private drawHeader(doc: PDFKit.PDFDocument, name: string, location: string, monthLabel: string) {
    this.eyebrow(doc, 'ANALYTICS', 50);

    doc.font(this.fonts.displayItalic).fontSize(24).fillColor(NAVY)
      .text(name, 50, 68);

    if (location) {
      doc.font(this.fonts.body).fontSize(10).fillColor(MUTED)
        .text(location, 50, doc.y + 2);
    }

    doc.font(this.fonts.mono).fontSize(10).fillColor(NAVY)
      .text(`Feedback Report — ${monthLabel}`, 50, doc.y + 8);

    const lineY = doc.y + 14;
    doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(0.75).strokeColor(HAIRLINE).stroke();
    doc.moveTo(50, lineY).lineTo(110, lineY).lineWidth(2).strokeColor(GOLD).stroke();
    doc.y = lineY + 20;
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
    const cardH = 56;
    const y = doc.y;

    stats.forEach((s, i) => {
      const x = 50 + i * (cardW + gap);
      this.card(doc, x, y, cardW, cardH);
      doc.moveTo(x + 12, y + 12).lineTo(x + 12, y + 44).lineWidth(2).strokeColor(GOLD).stroke();
      doc.font(this.fonts.displayItalic).fontSize(17).fillColor(NAVY)
        .text(s.value, x + 20, y + 12, { width: cardW - 30 });
      doc.font(this.fonts.body).fontSize(7.5).fillColor(MUTED)
        .text(s.label, x + 20, y + 34, { width: cardW - 30 });
    });

    doc.y = y + cardH + 24;
  }

  private drawWaiterTable(
    doc: PDFKit.PDFDocument,
    waiters: Awaited<ReturnType<typeof feedbackAnalyticsService.getWaiterPerformance>>,
  ) {
    if (doc.y > 600) doc.addPage();

    this.eyebrow(doc, 'WAITER PERFORMANCE', doc.y);
    doc.moveDown(0.9);

    const colX = [60, 280, 370, 460];
    const rowH = 24;
    let y = doc.y;

    doc.rect(50, y, 495, rowH).fillColor(TINT).fill();
    doc.moveTo(50, y + rowH).lineTo(545, y + rowH).lineWidth(1).strokeColor(GOLD).stroke();
    doc.font(this.fonts.monoMedium).fontSize(8).fillColor(MUTED);
    doc.text('WAITER', colX[0], y + 8);
    doc.text('FEEDBACK #', colX[1], y + 8);
    doc.text('OVERALL', colX[2], y + 8);
    doc.text('FRIENDLINESS', colX[3], y + 8);
    y += rowH;

    const rows = waiters.slice(0, 15);
    rows.forEach((w, i) => {
      if (y > 730) { doc.addPage(); y = 50; }
      doc.font(this.fonts.body).fontSize(9).fillColor(NAVY);
      doc.text(w.waiter_name, colX[0], y + 7, { width: 210 });
      doc.font(this.fonts.mono).fillColor(MUTED);
      doc.text(String(w.feedbackCount), colX[1], y + 7);
      doc.text((w.averages.overall_rating ?? 0).toFixed(2), colX[2], y + 7);
      doc.text((w.averages.friendliness_rating ?? 0).toFixed(2), colX[3], y + 7);
      doc.moveTo(50, y + rowH).lineTo(545, y + rowH).lineWidth(0.5).strokeColor(HAIRLINE).stroke();
      y += rowH;
    });

    doc.y = y + 22;
  }

  private drawDistribution(
    doc: PDFKit.PDFDocument,
    distribution: Awaited<ReturnType<typeof feedbackAnalyticsService.getRatingDistribution>>,
  ) {
    const overall = distribution.find((d) => d.field === 'overall_rating');
    if (!overall) return;

    if (doc.y > 640) doc.addPage();

    this.eyebrow(doc, 'OVERALL RATING DISTRIBUTION', doc.y);
    doc.moveDown(0.9);

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

      doc.rect(trackX, y, barMaxWidth, 6).fillColor(GOLD_TRACK).fill();
      if (width > 2) doc.rect(trackX, y, width, 6).fillColor(GOLD).fill();

      doc.font(this.fonts.mono).fontSize(9).fillColor(MUTED)
        .text(String(count), trackX + barMaxWidth + 12, y + 1);

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

    this.eyebrow(doc, 'DAILY BREAKDOWN', doc.y);
    doc.moveDown(0.9);

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

      if (hasData) {
        doc.fillOpacity(this.ratingOpacity(entry.averageOverallRating));
        doc.roundedRect(x, y, cellW, cellH, 3).fillColor(GOLD).fill();
        doc.fillOpacity(1);
      } else {
        doc.roundedRect(x, y, cellW, cellH, 3).fillColor('#FCFBF8').fill();
      }
      doc.roundedRect(x, y, cellW, cellH, 3).strokeColor(HAIRLINE).lineWidth(0.75).stroke();

      doc.font(this.fonts.mono).fontSize(7).fillColor(FAINT)
        .text(String(dayNum), x + 5, y + 4);

      if (hasData) {
        doc.font(this.fonts.displayItalic).fontSize(9).fillColor(NAVY)
          .text(entry.averageOverallRating.toFixed(1), x + 5, y + 20);
        doc.font(this.fonts.mono).fontSize(6).fillColor(MUTED)
          .text(`${entry.feedbackCount} fb`, x + 5, y + 30);
      } else {
        doc.font(this.fonts.mono).fontSize(7).fillColor('#D7D2C4')
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