import { Request, Response } from 'express';
import prisma from '../config/database';
import { printerTypeSchema } from '../validations/printerTypeValidation';

// Create a new PrinterType
export const createPrinterType = async (req: Request, res: Response) => {
  const { error } = printerTypeSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name } = req.body;

  try {
    const printerType = await prisma.printerType.create({
      data: { name },
    });

    res.status(201).json({ message: 'Printer Type created successfully', printerType });
  } catch (err) {
    console.error('Create Printer Type Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an existing PrinterType
export const updatePrinterType = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = printerTypeSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name } = req.body;

  try {
    const printerType = await prisma.printerType.findUnique({ where: { id: Number(id) } });
    if (!printerType) return res.status(404).json({ message: 'Printer Type not found' });

    const updatedPrinterType = await prisma.printerType.update({
      where: { id: Number(id) },
      data: { name },
    });

    res.status(200).json({ message: 'Printer Type updated successfully', printerType: updatedPrinterType });
  } catch (err) {
    console.error('Update Printer Type Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a PrinterType
export const deletePrinterType = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const printerType = await prisma.printerType.findUnique({ where: { id: Number(id) } });
    if (!printerType) return res.status(404).json({ message: 'Printer Type not found' });

    // Ensure there are no associated categories before deleting
    const associatedCategories = await prisma.category.findMany({ where: { printerTypeId: Number(id) } });
    if (associatedCategories.length > 0) {
      return res.status(400).json({ message: 'Cannot delete Printer Type with associated categories' });
    }

    await prisma.printerType.delete({ where: { id: Number(id) } });
    res.status(200).json({ message: 'Printer Type deleted successfully' });
  } catch (err) {
    console.error('Delete Printer Type Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get details of a specific PrinterType with associated categories
export const getPrinterTypeDetails = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const printerType = await prisma.printerType.findUnique({
      where: { id: Number(id) },
      include: { categories: true },
    });

    if (!printerType) return res.status(404).json({ message: 'Printer Type not found' });

    res.status(200).json({ printerType });
  } catch (err) {
    console.error('Get Printer Type Details Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List all PrinterTypes with pagination
export const listPrinterTypes = async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const printerTypes = await prisma.printerType.findMany({
      skip: offset,
      take: Number(limit),
      include: { categories: true },
    });

    const totalPrinterTypes = await prisma.printerType.count();

    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(totalPrinterTypes / Number(limit)),
      printerTypes,
    });
  } catch (err) {
    console.error('List Printer Types Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
