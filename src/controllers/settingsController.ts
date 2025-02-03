import { Request, Response } from 'express';
import prisma from '../config/database';
import { settingsSchema } from '../validations/settingsValidation';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

export const getSettings = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) return res.status(404).json({ message: 'Settings not found' });

    res.status(200).json({ settings });
  } catch (err) {
    console.error('Get Settings Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSettings = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { newsSubscription, notificationEmail, notificationSMS } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { error } = settingsSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const updatedSettings = await prisma.settings.update({
      where: { userId },
      data: {
        newsSubscription: newsSubscription !== undefined ? newsSubscription : undefined,
        notificationEmail: notificationEmail !== undefined ? notificationEmail : undefined,
        notificationSMS: notificationSMS !== undefined ? notificationSMS : undefined,
      },
    });

    res.status(200).json({ message: 'Settings updated successfully', settings: updatedSettings });
  } catch (err) {
    console.error('Update Settings Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
