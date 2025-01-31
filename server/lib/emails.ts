
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
import sgMail from "@sendgrid/mail";
import { SendGridTemplates } from "./sendgridTemplates";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

interface SendMagicLinkEmailOptions {
  toEmail: string;
  galleryTitle: string;
  signUpUrl: string;
  role: string;
  photographerName: string;
  galleryThumbnail: string | null;
}

export async function sendMagicLinkEmail(opts: SendMagicLinkEmailOptions) {
  const {
    toEmail,
    galleryTitle,
    signUpUrl,
    role,
    photographerName,
    galleryThumbnail,
  } = opts;

  const templateId = SendGridTemplates.magicLinkInvite;

  if (!templateId) {
    throw new Error("Magic link email template ID not configured");
  }

  const msg = {
    to: toEmail,
    from: "hello@beam.ms",
    templateId,
    dynamic_template_data: {
      galleryName: galleryTitle,
      signUpUrl,
      role,
      photographerName,
      galleryThumbnail: galleryThumbnail || "https://cdn.beam.ms/placeholder.jpg",
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Magic link email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending magic link email:", error);
    throw error;
  }
}
