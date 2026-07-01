import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${env.clientUrl}/verify-email?token=${token}`;
  const transport = getTransporter();

  if (!transport) {
    console.log(`[email:mock] Verification link for ${email}: ${verifyUrl}`);
    return { mock: true, verifyUrl };
  }

  await transport.sendMail({
    from: env.smtp.from,
    to: email,
    subject: "Verify your CodeArena account",
    html: `
      <h2>Welcome to CodeArena!</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  });

  return { sent: true };
}

export async function sendDuelResultEmail(email, { won, ratingChange, opponent }) {
  const transport = getTransporter();
  const subject = won ? "You won your CodeArena duel!" : "CodeArena duel result";
  const html = `
    <h2>Duel Result</h2>
    <p>You ${won ? "won" : "lost"} against ${opponent}.</p>
    <p>Rating change: ${ratingChange > 0 ? "+" : ""}${ratingChange}</p>
  `;

  if (!transport) {
    console.log(`[email:mock] ${subject} → ${email}`);
    return { mock: true };
  }

  await transport.sendMail({ from: env.smtp.from, to: email, subject, html });
  return { sent: true };
}
