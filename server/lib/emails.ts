
import sgMail from "@sendgrid/mail";
import { SendGridTemplates } from "./sendgridTemplates";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

interface SendInviteEmailOptions {
  toEmail: string;
  fromEmail?: string;
  galleryTitle: string;
  inviteUrl: string;
  galleryThumbnail: string | null;
  photographerName: string;
  recipientName?: string;
  role: string;
  isRegistered: boolean;
}

export async function sendInviteEmail(opts: SendInviteEmailOptions) {
  const {
    toEmail,
    fromEmail = "hello@beam.ms",
    galleryTitle,
    inviteUrl,
    galleryThumbnail,
    photographerName,
    recipientName = "there",
    role,
    isRegistered,
  } = opts;

  const templateId = SendGridTemplates.inviteEmail;

  if (!templateId) {
    throw new Error("Invite email template ID not configured");
  }

  const dynamicTemplateData = {
    recipientName,
    photographerName,
    galleryName: galleryTitle,
    galleryUrl: inviteUrl,
    galleryThumbnail: galleryThumbnail || "https://cdn.beam.ms/placeholder.jpg",
    role,
    isRegistered,
  };

  const msg = {
    to: toEmail,
    from: fromEmail,
    templateId,
    dynamic_template_data: dynamicTemplateData,
  };

  try {
    await sgMail.send(msg);
    console.log(`Invite email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending invite email:", error);
    throw error;
  }
}
