
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

interface SendInviteEmailOptions {
  toEmail: string;
  fromEmail?: string;
  galleryTitle: string;
  inviteUrl: string;
  galleryThumbnail?: string;
  photographerName?: string;
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
    galleryThumbnail = "",
    photographerName = "A Beam User",
    recipientName = "there",
    role,
    isRegistered,
  } = opts;

  const templateId = process.env.SENDGRID_TEMPLATE_ID || "d-defaulttemplateid";

  const dynamicTemplateData = {
    recipientName,
    photographerName,
    galleryName: galleryTitle,
    galleryUrl: inviteUrl,
    galleryThumbnail,
    role,
    isRegistered,
    signUpUrl: `${process.env.VITE_APP_URL}/sign-up?email=${encodeURIComponent(toEmail)}`,
  };

  const msg = {
    to: toEmail,
    from: {
      email: fromEmail,
      name: "Beam Galleries"
    },
    templateId,
    dynamic_template_data: dynamicTemplateData,
  };

  try {
    await sgMail.send(msg);
    console.log("Invite email sent:", {
      to: toEmail,
      galleryName: galleryTitle,
      role,
      isRegistered,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to send invite email:", {
      error: error instanceof Error ? error.message : "Unknown error",
      to: toEmail,
      galleryName: galleryTitle,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
