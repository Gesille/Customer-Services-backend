import ExcelJS from 'exceljs';
import { Response } from 'express';
import { feedbackAnalyticsService } from './feedback-analytics.service';
import { restaurantService } from './restaurant.service';

class FeedbackExportService {
  async streamFeedbackExcel(res: Response, restaurantId: string): Promise<void> {
    const restaurant = await restaurantService.getById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const rows = await feedbackAnalyticsService.getAllFeedbackDetails(restaurantId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Feedback');

    sheet.columns = [
      { header: 'Customer Name',  key: 'customer_name',  width: 28 },
      { header: 'Customer Email', key: 'customer_email', width: 32 },
      { header: 'Receipt No',     key: 'receipt_no',     width: 18 },
      { header: 'Waiter',         key: 'waiter_name',     width: 20 },
      { header: 'Overall Rating', key: 'overall_rating',  width: 14 },
      { header: 'Recommendation', key: 'recommendation',  width: 16 },
      { header: 'Date',           key: 'date',            width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const r of rows) {
      sheet.addRow({
        customer_name:  r.customer_name,
        customer_email: r.customer_email,
        receipt_no:     r.receipt_no,
        waiter_name:    r.waiter_name,
        overall_rating: r.overall_rating,
        recommendation: r.recommendation,
        date:           new Date(r.date).toLocaleDateString(),
      });
    }

    const slug = restaurant.x_name.replace(/\s+/g, '-').toLowerCase();
    const filename = `${slug}-feedback-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }
}

export const feedbackExportService = new FeedbackExportService();