
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

interface SendInviteEmailOptions {
  toEmail: string;
  fromEmail?: string;
  galleryTitle: string;
  inviteUrl: string;
  signUpUrl?: string;
  isRegistered: boolean;
  role: string;
}

export async function sendInviteEmail(opts: SendInviteEmailOptions) {
  const {
    toEmail,
    fromEmail = "hello@beam.ms",
    galleryTitle,
    inviteUrl,
    signUpUrl,
    isRegistered,
    role
  } = opts;

  const subject = isRegistered
    ? `You've been invited to view ${galleryTitle}`
    : `Join us on ${galleryTitle}!`;

  let htmlContent: string;

  if (isRegistered) {
    htmlContent = `
    <h2>You've been invited to ${galleryTitle}!</h2>
    <p>Someone invited you to ${galleryTitle}. You can click below to view it:</p>
    <p><a href="${inviteUrl}" style="color: #fff; background: #007bcc; padding: 10px 20px; text-decoration: none;">View Gallery</a></p>
    <p>This gallery role is: <strong>${role}</strong></p>
    <p>Enjoy!</p>
    `;
  } else {
    const signUpSection = role === "Edit" || role === "Comment"
      ? `
      <p>Because you've been invited as a <strong>${role}</strong>, you'll need a free account to 
      interact fully (e.g., comment or edit images). 
      <a href="${signUpUrl}">Click here to sign up</a>.</p>
      `
      : `
      <p>You're welcome to view the gallery without an account, but 
      <a href="${signUpUrl}">signing up</a> is quick & free!</p>
      `;

    htmlContent = `
    <h2>Hello!</h2>
    <p>You've been invited to check out <strong>${galleryTitle}</strong>.</p>
    <p>Click below to view it:</p>
    <p><a href="${inviteUrl}" style="color: #fff; background: #007bcc; padding: 10px 20px; text-decoration: none;">View Gallery</a></p>
    ${signUpSection}
    <p>We hope you join us!</p>
    `;
  }

  const msg = {
    to: toEmail,
    from: fromEmail,
    subject,
    html: htmlContent
  };

  try {
    await sgMail.send(msg);
    console.log(`Invite email sent to ${toEmail}`);
  } catch (error) {
    console.error("Error sending invite email:", error);
    throw error;
  }
}
