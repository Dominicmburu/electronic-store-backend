import { Request, Response } from 'express';
import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { categorySchema } from '../validations/categoryValidation'

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
  const { error } = categorySchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, description, images, printerTypeId } = req.body;

  try {
    // Check if the printer type exists
    const printerType = await prisma.printerType.findUnique({ where: { id: printerTypeId } });
    if (!printerType) return res.status(404).json({ message: 'Printer Type not found' });

    // Create the category
    const category = await prisma.category.create({
      data: {
        name,
        description,
        images,
        printerTypeId,
      },
    });

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (err) {
    console.error('Create Category Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an existing category
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = categorySchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, description, images, printerTypeId } = req.body;

  try {
    // Check if the category exists
    const category = await prisma.category.findUnique({ where: { id: Number(id) } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Check if the printer type exists
    const printerType = await prisma.printerType.findUnique({ where: { id: printerTypeId } });
    if (!printerType) return res.status(404).json({ message: 'Printer Type not found' });

    // Update the category
    const updatedCategory = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, description, images, printerTypeId },
    });

    res.status(200).json({ message: 'Category updated successfully', category: updatedCategory });
  } catch (err) {
    console.error('Update Category Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a category
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Check if the category exists
    const category = await prisma.category.findUnique({ where: { id: Number(id) } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Delete the category
    await prisma.category.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete Category Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get details of a specific category
export const getCategoryDetails = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        printerType: true,
        products: true,
      },
    });

    if (!category) return res.status(404).json({ message: 'Category not found' });

    res.status(200).json({ category });
  } catch (err) {
    console.error('Get Category Details Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List all categories with pagination
export const listCategories = async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const categories = await prisma.category.findMany({
      skip: offset,
      take: Number(limit),
      include: { printerType: true },
    });

    const totalCategories = await prisma.category.count();

    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(totalCategories / Number(limit)),
      categories,
    });
  } catch (err) {
    console.error('List Categories Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
