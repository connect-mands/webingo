import { env } from "../config/env.js";

function hasEmailJsPasswordResetConfig() {
  return Boolean(env.emailjs.serviceId && env.emailjs.publicKey && env.emailjs.passwordResetTemplateId);
}

function hasEmailJsInviteConfig() {
  return Boolean(env.emailjs.serviceId && env.emailjs.publicKey && env.emailjs.inviteTemplateId);
}

async function sendEmailJsTemplate({ templateId, templateParams, errorLabel }) {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      service_id: env.emailjs.serviceId,
      template_id: templateId,
      user_id: env.emailjs.publicKey,
      template_params: templateParams
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`EmailJS ${errorLabel} email failed: ${message}`);
  }
}

function logDevEmail({ to, subject, text }) {
  console.log(`[dev-mail] To: ${to}\nSubject: ${subject}\n${text}`);
}

export async function sendPasswordResetEmail({ to, link }) {
  if (hasEmailJsPasswordResetConfig()) {
    await sendEmailJsTemplate({
      templateId: env.emailjs.passwordResetTemplateId,
      errorLabel: "password reset",
      templateParams: {
        to_email: to,
        email: to,
        link
      }
    });
    return;
  }

  logDevEmail({
    to,
    subject: "Reset your password",
    text: `Use this link to reset your password: ${link}`
  });
}

export async function sendProjectInvitationEmail({ to, name, projectName, role, link }) {
  if (hasEmailJsInviteConfig()) {
    await sendEmailJsTemplate({
      templateId: env.emailjs.inviteTemplateId,
      errorLabel: "project invitation",
      templateParams: {
        to_email: to,
        email: to,
        name,
        project_name: projectName,
        role,
        link
      }
    });
    return;
  }
  logDevEmail({
    to,
    subject: "Project invitation",
    text: `You were invited to join ${projectName} as ${role}: ${link}`
  });
}
