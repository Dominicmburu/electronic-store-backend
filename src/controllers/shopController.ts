import { Request, Response } from 'express';
import prisma from '../config/database';

export const getShops = async (req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany();

    res.status(200).json({ shops });
  } catch (err) {
    console.error('Get Shops Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addShop = async (req: Request, res: Response) => {
  const { name, address, phone, email, hours, latitude, longitude } = req.body;

  if (!name || !address || !phone || !email || !hours || !latitude || !longitude)
    return res.status(400).json({ message: 'All shop details are required' });

  try {
    const newShop = await prisma.shop.create({
      data: {
        name,
        address,
        phone,
        email,
        hours,
        latitude,
        longitude,
      },
    });

    res.status(201).json({ message: 'Shop added successfully', shop: newShop });
  } catch (err) {
    console.error('Add Shop Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateShop = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, phone, email, hours, latitude, longitude } = req.body;

  try {
    const shop = await prisma.shop.findUnique({ where: { id: Number(id) } });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const updatedShop = await prisma.shop.update({
      where: { id: Number(id) },
      data: {
        name: name || shop.name,
        address: address || shop.address,
        phone: phone || shop.phone,
        email: email || shop.email,
        hours: hours || shop.hours,
        latitude: latitude || shop.latitude,
        longitude: longitude || shop.longitude,
      },
    });

    res.status(200).json({ message: 'Shop updated successfully', shop: updatedShop });
  } catch (err) {
    console.error('Update Shop Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteShop = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const shop = await prisma.shop.findUnique({ where: { id: Number(id) } });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    await prisma.shop.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: 'Shop deleted successfully' });
  } catch (err) {
    console.error('Delete Shop Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
