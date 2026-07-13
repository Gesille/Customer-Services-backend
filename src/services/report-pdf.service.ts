import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { feedbackAnalyticsService } from './feedback-analytics.service';
import { restaurantService } from './restaurant.service';

const INK = '#26211B';
const MUTED = '#8C8070';
const BRASS = '#B8860B';
const HAIRLINE = '#E8E3DA';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class ReportPdfService {
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
    doc.pipe(res);

    this.drawHeader(doc, restaurant.x_name, restaurant.x_location, monthLabel);
    this.drawOverview(doc, overview);
    this.drawWaiterTable(doc, waiters);
    this.drawDistribution(doc, distribution);
    this.drawCalendar(doc, daily, year, month);

    doc.end();
  }

  private drawHeader(doc: PDFKit.PDFDocument, name: string, location: string, monthLabel: string) {
    doc.fontSize(20).fillColor(INK).text(name);
    doc.fontSize(10).fillColor(MUTED).text(location);
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor(BRASS).text(`Feedback Report — ${monthLabel}`);
    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(HAIRLINE).stroke();
    doc.moveDown(1);
  }

  private drawOverview(doc: PDFKit.PDFDocument, overview: Awaited<ReturnType<typeof feedbackAnalyticsService.getOverview>>) {
    doc.fontSize(13).fillColor(INK).text('Overview');
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(MUTED);
    doc.text(`Total feedback: ${overview.totalFeedbacks}`);
    doc.text(`Overall rating average: ${(overview.averages.overall_rating ?? 0).toFixed(2)} / 5`);
    doc.text(`First feedback: ${overview.firstFeedbackAt ? new Date(overview.firstFeedbackAt).toDateString() : '—'}`);
    doc.text(`Last feedback: ${overview.lastFeedbackAt ? new Date(overview.lastFeedbackAt).toDateString() : '—'}`);
    doc.moveDown(0.4);
    doc.fillColor(INK).text('Recommendation breakdown:');
    for (const [key, val] of Object.entries(overview.recommendationPercentage)) {
      doc.fillColor(MUTED).text(`  ${key}: ${val}%`);
    }
    doc.moveDown(1);
  }

  private drawWaiterTable(doc: PDFKit.PDFDocument, waiters: Awaited<ReturnType<typeof feedbackAnalyticsService.getWaiterPerformance>>) {
    if (doc.y > 620) doc.addPage();
    doc.fontSize(13).fillColor(INK).text('Waiter Performance');
    doc.moveDown(0.4);

    const colX = [50, 260, 350, 440];
    let y = doc.y;
    doc.fontSize(9).fillColor(MUTED);
    doc.text('Waiter', colX[0], y, { width: 200 });
    doc.text('Feedback #', colX[1], y);
    doc.text('Overall', colX[2], y);
    doc.text('Friendliness', colX[3], y);
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(HAIRLINE).stroke();
    doc.moveDown(0.3);

    doc.fontSize(9).fillColor(INK);
    for (const w of waiters.slice(0, 15)) {
      if (doc.y > 730) { doc.addPage(); y = doc.y; } else { y = doc.y; }
      doc.text(w.waiter_name, colX[0], y, { width: 200 });
      doc.text(String(w.feedbackCount), colX[1], y);
      doc.text((w.averages.overall_rating ?? 0).toFixed(2), colX[2], y);
      doc.text((w.averages.friendliness_rating ?? 0).toFixed(2), colX[3], y);
      doc.moveDown(0.5);
    }
    doc.moveDown(0.6);
  }

  private drawDistribution(doc: PDFKit.PDFDocument, distribution: Awaited<ReturnType<typeof feedbackAnalyticsService.getRatingDistribution>>) {
    const overall = distribution.find(d => d.field === 'overall_rating');
    if (!overall) return;

    if (doc.y > 650) doc.addPage();
    doc.fontSize(13).fillColor(INK).text('Overall Rating Distribution');
    doc.moveDown(0.4);

    const counts = Object.values(overall.distribution) as number[];
    const maxCount = Math.max(1, ...counts);
    const barMaxWidth = 300;

    for (const star of [5, 4, 3, 2, 1] as const) {
      const count = overall.distribution[star] ?? 0;
      const width = (count / maxCount) * barMaxWidth;
      const y = doc.y;
      doc.fontSize(9).fillColor(MUTED).text(`${star} star`, 50, y, { width: 40 });
      doc.rect(95, y, barMaxWidth, 8).fillColor(HAIRLINE).fill();
      if (width > 0) doc.rect(95, y, width, 8).fillColor(BRASS).fill();
      doc.fillColor(MUTED).text(String(count), 95 + barMaxWidth + 10, y);
      doc.moveDown(0.6);
    }
    doc.moveDown(0.6);
  }

  private drawCalendar(
    doc: PDFKit.PDFDocument,
    daily: Awaited<ReturnType<typeof feedbackAnalyticsService.getDailyReport>>,
    year: number,
    month: number,
  ) {
    if (doc.y > 500) doc.addPage();
    doc.fontSize(13).fillColor(INK).text('Daily Breakdown');
    doc.moveDown(0.4);

    const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sun
    const cellW = 68;
    const cellH = 42;
    const startX = 50;

    let headerY = doc.y;
    doc.fontSize(8).fillColor(MUTED);
    DAY_LABELS.forEach((label, i) => doc.text(label, startX + i * cellW, headerY, { width: cellW, align: 'center' }));

    let x = startX + startWeekday * cellW;
    let y = headerY + 16;

    for (const entry of daily) {
      const dayNum = Number(entry.date.split('-')[2]);

      doc.rect(x, y, cellW - 2, cellH - 2).strokeColor(HAIRLINE).stroke();
      doc.fontSize(8).fillColor(INK).text(String(dayNum), x + 4, y + 3);

      if (entry.feedbackCount > 0) {
        doc.fontSize(7).fillColor(BRASS).text(`${entry.averageOverallRating.toFixed(1)} avg`, x + 4, y + 16);
        doc.fontSize(7).fillColor(MUTED).text(`${entry.feedbackCount} fb`, x + 4, y + 27);
      } else {
        doc.fontSize(7).fillColor(MUTED).text('—', x + 4, y + 16);
      }

      const weekday = (startWeekday + dayNum) % 7;
      if (weekday === 0) {
        x = startX;
        y += cellH;
        if (y > 720) { doc.addPage(); y = 50; }
      } else {
        x += cellW;
      }
    }
  }
}

export const reportPdfService = new ReportPdfService();