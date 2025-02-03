import { Request, Response } from 'express';
import { sendContactEmail } from '../utils/emailUtils';
import { contactSchema } from '../validations/contactValidation';

// Handle Contact Us form submission
export const contactUs = async (req: Request, res: Response) => {
  // Validate request body
  const { error } = contactSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const { name, email, message } = req.body;

  try {
    // Send email using nodemailer
    await sendContactEmail(name, email, message);
    res.status(200).json({ message: 'Contact email sent successfully' });
  } catch (err) {
    console.error('Contact Us Error:', err);
    res.status(500).json({ message: 'Failed to send email' });
  }
};
