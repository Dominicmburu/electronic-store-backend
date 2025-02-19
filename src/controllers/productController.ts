import { Request, Response } from 'express';
import prisma from '../config/database';
import { productSchema } from '../validations/productValidation';
import { updateFeaturedSchema } from '../validations/productValidation';

export const getFeaturedPrinters = async (req: Request, res: Response) => {
  try {
    const featuredPrinters = await prisma.product.findMany({
      where: { isFeatured: true },
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        currentPrice: true,
      },
    });

    res.status(200).json({ featuredPrinters });
  } catch (err) {
    console.error('Get Featured Printers Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listProducts = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, categoryId, isFeatured, search, sort } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const filters: any = {};
    if (categoryId) filters.categoryId = Number(categoryId);
    if (isFeatured) filters.isFeatured = isFeatured === 'true';
    if (search) filters.name = { contains: String(search), mode: 'insensitive' };

    let orderBy: any = { createdAt: 'desc' }; 
    if (typeof sort === 'string' && sort !== 'default') {
      if (sort === 'price-low-high') {
        orderBy = { currentPrice: 'asc' };
      } else if (sort === 'price-high-low') {
        orderBy = { currentPrice: 'desc' };
      } else if (sort === 'latest') {
        orderBy = { createdAt: 'desc' };
      }
    }

    console.log('[listProducts] Filters:', filters);
    console.log('[listProducts] OrderBy:', orderBy);
    console.log('[listProducts] Page:', page, 'Limit:', limit, 'Offset:', offset);

    const products = await prisma.product.findMany({
      where: filters,
      skip: offset,
      take: Number(limit),
      orderBy: orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        currentPrice: true,
        lastPrice: true,
        isFeatured: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalProducts = await prisma.product.count({ where: filters });

    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(totalProducts / Number(limit)),
      totalProducts,
      products,
    });
  } catch (err) {
    console.error('List Products Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get latest printers
export const getLatestPrinters = async (req: Request, res: Response) => {
  try {
    const latestPrinters = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        lastPrice: true,
        currentPrice: true,
      },
    });

    res.status(200).json({ latestPrinters });
  } catch (err) {
    console.error('Get Latest Printers Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get detailed information about a specific product
export const getProductDetails = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        reviews: {
          include: { user: { select: { name: true } } },
        },
        category: true,
      },
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.status(200).json({ product });
  } catch (err) {
    console.error('Get Product Details Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new product (Admin functionality)
export const createProduct = async (req: Request, res: Response) => {
  // Assuming you have admin middleware to protect this route
  // Validate request body
  const { error } = productSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, description, lastPrice, currentPrice, specifications, images, isFeatured, categoryId } = req.body;

  try {
    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Create the product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        lastPrice,
        currentPrice,
        specifications,
        images,
        isFeatured: isFeatured || false,
        category: { connect: { id: categoryId } },
      },
    });

    // If product is added to a printer type category, increment the printer count
    const printerTypeId = category.printerTypeId;
    await prisma.printerType.update({
      where: { id: printerTypeId },
      data: { printerCount: { increment: 1 } },
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    console.error('Create Product Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an existing product (Admin functionality)
export const updateProduct = async (req: Request, res: Response) => {
  // Assuming you have admin middleware to protect this route
  const { id } = req.params;
  const { error } = productSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { name, description, lastPrice, currentPrice, specifications, images, isFeatured, categoryId } = req.body;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // If categoryId is being updated, check if new category exists and update printer counts
    if (categoryId && categoryId !== product.categoryId) {
      const oldCategory = await prisma.category.findUnique({ where: { id: product.categoryId } });
      const newCategory = await prisma.category.findUnique({ where: { id: categoryId } });

      if (!newCategory) return res.status(404).json({ message: 'New category not found' });

      // Decrement old printer type count
      await prisma.printerType.update({
        where: { id: oldCategory!.printerTypeId },
        data: { printerCount: { decrement: 1 } },
      });

      // Increment new printer type count
      await prisma.printerType.update({
        where: { id: newCategory.printerTypeId },
        data: { printerCount: { increment: 1 } },
      });
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        lastPrice,
        currentPrice,
        specifications,
        images,
        isFeatured,
        categoryId: categoryId || product.categoryId,
      },
    });

    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update the isFeatured status of a product (Admin functionality)
export const updateProductFeaturedStatus = async (req: Request, res: Response) => {
  const { id } = req.params; // Product ID from URL
  const { isFeatured } = req.body; // New isFeatured status from the request body

  const { error } = updateFeaturedSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // Check if the product exists
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update the isFeatured status
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: { isFeatured },
    });

    res.status(200).json({
      message: 'Product featured status updated successfully',
      product: updatedProduct,
    });
  } catch (err) {
    console.error('Update Product Featured Status Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a product (Admin functionality)
export const deleteProduct = async (req: Request, res: Response) => {
  // Assuming you have admin middleware to protect this route
  const { id } = req.params;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete the product
    await prisma.product.delete({ where: { id: Number(id) } });

    // Decrement printer count if applicable
    const category = await prisma.category.findUnique({ where: { id: product.categoryId } });
    if (category) {
      await prisma.printerType.update({
        where: { id: category.printerTypeId },
        data: { printerCount: { decrement: 1 } },
      });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete Product Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
