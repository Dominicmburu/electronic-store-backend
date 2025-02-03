// src/utils/emailUtils.ts

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_PASS, // Your Gmail password or App Password
  },
});

/**
 * Sends a contact email using Nodemailer.
 * @param name - Name of the user contacting.
 * @param email - Email address of the user.
 * @param message - Message from the user.
 */
export const sendContactEmail = async (name: string, email: string, message: string) => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER, // Sending to yourself or support team
    subject: `Contact Us - Message from ${name}`,
    text: `
      You have received a new contact message.

      Name: ${name}
      Email: ${email}

      Message:
      ${message}
    `,
  };

  await transporter.sendMail(mailOptions);
};
