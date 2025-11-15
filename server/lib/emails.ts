
import sgMail from "@sendgrid/mail";
import { SendGridTemplates } from "./sendgridTemplates";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// Helper function to escape HTML special characters for SendGrid templates
function escapeHtml(str: string): string {
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

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
    recipientName: escapeHtml(recipientName),
    photographerName: escapeHtml(photographerName),
    galleryName: escapeHtml(galleryTitle),
    galleryUrl: inviteUrl,
    galleryThumbnail: galleryThumbnail || "https://cdn.beam.ms/placeholder.jpg",
    role: escapeHtml(role),
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
  const baseUrl = process.env.VITE_APP_URL || signUpUrl.split('?')[0];
  const inviteToken = new URL(signUpUrl).searchParams.get('inviteToken');
  const gallery = new URL(signUpUrl).searchParams.get('gallery');
  
  const magicLinkUrl = `${baseUrl}/magic-link?email=${encodeURIComponent(toEmail)}&inviteToken=${inviteToken}&gallery=${gallery}`;

  if (!templateId) {
    console.error("Magic link template not found, using invite template as fallback");
    throw new Error("Email template not configured");
  }

  const msg = {
    to: toEmail,
    from: {
      email: "hello@beam.ms",
      name: "Beam"
    },
    templateId,
    dynamic_template_data: {
      recipientName: escapeHtml(toEmail.split('@')[0]),
      galleryName: escapeHtml(galleryTitle),
      signUpUrl: magicLinkUrl,
      galleryUrl: magicLinkUrl,
      role: escapeHtml(role),
      photographerName: escapeHtml(photographerName),
      galleryThumbnail: galleryThumbnail || "https://cdn.beam.ms/placeholder.jpg",
      isRegistered: false
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Magic link email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending magic link email:", error);
    
    if (error.response) {
      console.error("SendGrid Response:", JSON.stringify(error.response.body, null, 2));
    }
    
    throw error;
  }
}
