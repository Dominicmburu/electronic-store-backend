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


interface SalesQueryResult {
  totalSales: string | null;
  orderCount: string | null;
}

// Get category sales statistics
export const getCategorySales = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { period = 'monthly' } = req.query;

  try {
    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: Number(id) }
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Calculate date range based on period
    const dateRange = getDateRange(period as string);

    // Get total sales for this category
    const salesResult = await prisma.$queryRaw<SalesQueryResult[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as totalSales,
        COUNT(DISTINCT o.id) as orderCount
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."categoryId" = ${Number(id)}
        AND o."orderDate" BETWEEN ${dateRange.start} AND ${dateRange.end}
        AND o.status != 'CANCELLED'
    `;

    // Get sales data for previous period for trend calculation
    const prevDateRange = getDateRange(period as string, true);
    const prevSalesResult = await prisma.$queryRaw<SalesQueryResult[]>`
      SELECT 
        SUM(oi.price * oi.quantity) as totalSales
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi."orderId"
      JOIN "Product" p ON oi."productId" = p.id
      WHERE p."categoryId" = ${Number(id)}
        AND o."orderDate" BETWEEN ${prevDateRange.start} AND ${prevDateRange.end}
        AND o.status != 'CANCELLED'
    `;

    // Extract and convert values to numbers, handling null values
    const currentSales = salesResult?.[0]?.totalSales ? Number(salesResult[0].totalSales) : 0;
    const prevSales = prevSalesResult?.[0]?.totalSales ? Number(prevSalesResult[0].totalSales) : 0;
    const orderCount = salesResult?.[0]?.orderCount ? Number(salesResult[0].orderCount) : 0;

    // Calculate trend percentage
    let trend = 0;
    if (prevSales > 0) {
      trend = ((currentSales - prevSales) / prevSales) * 100;
    } else if (currentSales > 0) {
      trend = 100;
    }

    res.status(200).json({
      categoryId: Number(id),
      categoryName: category.name,
      totalSales: currentSales,
      orderCount,
      trend: parseFloat(trend.toFixed(1)),
      period,
      startDate: dateRange.start,
      endDate: dateRange.end
    });
  } catch (err) {
    console.error('Get Category Sales Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

function getDateRange(period: string, previous = false): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case 'daily':
      const dayOffset = previous ? -1 : 0;
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
      return { start: startOfDay, end: endOfDay };
      
    case 'weekly':
      const weekOffset = previous ? -7 : 0;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
      
    case 'yearly':
      const yearOffset = previous ? -1 : 0;
      const startOfYear = new Date(now.getFullYear() + yearOffset, 0, 1);
      const endOfYear = new Date(now.getFullYear() + yearOffset, 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      return { start: startOfYear, end: endOfYear };
      
    case 'monthly':
    default:
      const monthOffset = previous ? -1 : 0;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1 + monthOffset, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return { start: startOfMonth, end: endOfMonth };
  }
}