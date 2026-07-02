import nodemailer from 'nodemailer';
import { ENV } from '../config/env';
import { Feedback } from '../models/feedback.model';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderStars(rating: number): string {
  return '⭐'.repeat(Math.max(0, Math.min(5, rating)));
}

// Maps a 1–4 numeric rating back to the label shown on the form
const FRIENDLINESS_LABELS: Record<number, string> = {
  4: 'Excellent', 3: 'Good', 2: 'Fair', 1: 'Poor',
};
const ATTENTIVENESS_LABELS: Record<number, string> = {
  5: 'Very Satisfied', 4: 'Satisfied', 3: 'Neutral', 2: 'Dissatisfied', 1: 'Very Dissatisfied',
};
const MENU_KNOWLEDGE_LABELS: Record<number, string> = {
  4: 'Yes, completely', 3: 'Mostly', 2: 'Somewhat', 1: 'No',
};
const SERVICE_SPEED_LABELS: Record<number, string> = {
  4: 'Excellent', 3: 'Good', 2: 'Fair', 1: 'Poor',
};

function labelRow(question: string, rating: number, labels: Record<number, string>): string {
  const label = labels[rating] ?? `${rating}`;
  const max   = Object.keys(labels).length;
  return `<p><strong>${question}:</strong> ${escapeHtml(label)} (${rating}/${max})</p>`;
}

class EmailService {
  private transporter = nodemailer.createTransport({
    host:   ENV.EMAIL.HOST,
    port:   ENV.EMAIL.PORT,
    secure: false,
    auth:   { user: ENV.EMAIL.USER, pass: ENV.EMAIL.PASS },
  });

  async sendFeedbackNotification(
    feedback:       Feedback,
    restaurantName: string,
    managerEmail:   string,
  ): Promise<void> {
    const safe = {
      restaurant: escapeHtml(restaurantName),
      customer:   escapeHtml(feedback.x_customer_name),
      customerEmail: escapeHtml(feedback.x_customer_email), 
      waiter:     escapeHtml(feedback.x_waiter_name),
      comment:    escapeHtml(feedback.x_comment ?? 'No comment provided'),
      date:       escapeHtml(new Date(feedback.x_date).toLocaleString()),
      recommend:  escapeHtml(feedback.x_recommendation),
    };

    const html = `
<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">

  <h2 style="color: #333;">🍽️ New Restaurant Feedback</h2>

  <p><strong>Restaurant:</strong> ${safe.restaurant}</p>
  <p><strong>Customer:</strong> ${safe.customer}</p>
  <p><strong>Customer Email:</strong> ${safe.customerEmail}</p>
  <p><strong>Waiter / Staff:</strong> ${safe.waiter}</p>

  <hr style="margin: 16px 0;" />

  <h3 style="color: #555; margin-bottom: 12px;">Service Questions</h3>

  ${labelRow(
    'Friendliness &amp; professionalism of waiter/waitress',
    feedback.x_friendliness_rating,
    FRIENDLINESS_LABELS,
  )}

  ${labelRow(
    'Satisfaction with attentiveness throughout dining',
    feedback.x_attentiveness_rating,
    ATTENTIVENESS_LABELS,
  )}

  ${labelRow(
    'Menu knowledge &amp; ability to answer questions',
    feedback.x_menu_knowledge_rating,
    MENU_KNOWLEDGE_LABELS,
  )}

  ${labelRow(
    'Speed &amp; efficiency of service',
    feedback.x_service_speed_rating,
    SERVICE_SPEED_LABELS,
  )}

  <hr style="margin: 16px 0;" />

  <h3 style="color: #555; margin-bottom: 12px;">Additional Ratings</h3>

  <p><strong>Food Quality:</strong> ${renderStars(feedback.x_food_quality_rating)} (${feedback.x_food_quality_rating}/5)</p>
  <p><strong>Cleanliness:</strong> ${renderStars(feedback.x_cleanliness_rating)} (${feedback.x_cleanliness_rating}/5)</p>
  <p><strong>Overall Experience:</strong> ${renderStars(feedback.x_overall_rating)} (${feedback.x_overall_rating}/5)</p>

  <hr style="margin: 16px 0;" />

  <p><strong>Likelihood to return / recommend:</strong> ${safe.recommend}</p>

  <hr style="margin: 16px 0;" />

  <p><strong>Customer Comment:</strong></p>
  <p style="background: #f9f9f9; padding: 12px; border-left: 3px solid #ddd; border-radius: 4px;">
    ${safe.comment}
  </p>

  <hr style="margin: 16px 0;" />
  <small style="color: #999;">Submitted on: ${safe.date}</small>

</div>`;

    const recipients = [managerEmail, ENV.NOTIFICATIONS.HR_EMAIL]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(',');

    await this.transporter.sendMail({
      from:    `"Restaurant Feedback" <${ENV.EMAIL.USER}>`,
      to:      recipients,
      subject: `🍽️ New Feedback — ${restaurantName}`,
      html,
    });
  }
}

export const emailService = new EmailService();