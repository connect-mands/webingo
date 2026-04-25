import { MailtrapClient } from "mailtrap";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export async function sendMail({ to, subject, text }) {
  if (env.mailtrap.token) {
    const client = new MailtrapClient({ token: env.mailtrap.token });
    await client.send({
      from: {
        email: env.mailtrap.senderEmail,
        name: env.mailtrap.senderName
      },
      to: [{ email: to }],
      subject,
      text,
      category: "Project Management"
    });
    return;
  }

  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    console.log(`[dev-mail] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass }
  });
  await transporter.sendMail({ from: env.smtp.from, to, subject, text });
}
