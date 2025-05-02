import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '../config/database';
import { productSchema } from '../validations/productValidation';
import { updateFeaturedSchema } from '../validations/productValidation';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const uniquePrefix = 'A';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const finalFileName = uniquePrefix + '-' + uniqueSuffix + path.extname(file.originalname);
    cb(null, finalFileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPG, PNG, GIF).'));
    }
  }
}).array('images');

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
        stockQuantity: true,
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
        stockQuantity: true,
        specifications: true,
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
        stockQuantity: true,
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
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { error } = productSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    let {
      name,
      description,
      lastPrice,
      currentPrice,
      specifications,
      isFeatured,
      categoryId,
      stockQuantity
    } = req.body;

    const parsedLastPrice = parseFloat(lastPrice);
    const parsedCurrentPrice = parseFloat(currentPrice);
    const parsedStockQuantity = parseInt(stockQuantity || "0", 10);
    const parsedCategoryId = parseInt(categoryId, 10);
    const parsedIsFeatured = isFeatured === true || isFeatured === "true";

    // Get image paths from uploaded files
    const imageNames = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];

    try {
      // Check if category exists
      const category = await prisma.category.findUnique({
        where: {
          id: parsedCategoryId
        }
      });

      if (!category) return res.status(404).json({ message: 'Category not found' });

      // Create the product with explicitly typed values
      const productData = {
        name,
        description,
        lastPrice: parsedLastPrice,
        currentPrice: parsedCurrentPrice,
        specifications,
        images: imageNames,
        isFeatured: parsedIsFeatured,
        stockQuantity: parsedStockQuantity,
        category: {
          connect: {
            id: parsedCategoryId
          }
        }
      };

      // Debug the data being sent to Prisma
      console.log('Product data for Prisma:', JSON.stringify(productData, null, 2));

      const product = await prisma.product.create({ data: productData });

      // If product is added to a printer type category, increment the printer count
      if (category.printerTypeId) {
        const printerTypeId = parseInt(String(category.printerTypeId), 10);
        await prisma.printerType.update({
          where: { id: printerTypeId },
          data: { printerCount: { increment: 1 } },
        });
      }

      res.status(201).json({ message: 'Product created successfully', product });
    } catch (err) {
      console.error('Create Product Error:', err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  });
};


// Update an existing product (Admin functionality)
// export const updateProduct = async (req: Request, res: Response) => {
//   upload(req, res, async (err) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: err.message });
//     } else if (err) {
//       return res.status(400).json({ message: err.message });
//     }

//     const { error } = productSchema.validate(req.body);
//     if (error) return res.status(400).json({ message: error.details[0].message });

//     const { id } = req.params;
//     let { name, description, lastPrice, currentPrice, specifications, isFeatured, categoryId, stockQuantity } = req.body;

//     const parsedLastPrice = parseFloat(lastPrice);
//     const parsedCurrentPrice = parseFloat(currentPrice);
//     const parsedStockQuantity = parseInt(stockQuantity || "0", 10);
//     const parsedCategoryId = parseInt(categoryId, 10);
//     const parsedIsFeatured = isFeatured === true || isFeatured === "true";

//     // Get image names from uploaded files
//     const imageNames = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];

//     try {
//       // Check if product exists
//       const product = await prisma.product.findUnique({ where: { id: Number(id) } });
//       if (!product) return res.status(404).json({ message: 'Product not found' });

//       // If categoryId is being updated, check if new category exists and update printer counts
//       if (categoryId && categoryId !== product.categoryId) {
//         const oldCategory = await prisma.category.findUnique({ where: { id: product.categoryId } });
//         const newCategory = await prisma.category.findUnique({ where: { id: parseInt(categoryId, 10) } });

//         if (!newCategory) return res.status(404).json({ message: 'New category not found' });

//         // Decrement old printer type count
//         await prisma.printerType.update({
//           where: { id: oldCategory!.printerTypeId },
//           data: { printerCount: { decrement: 1 } },
//         });

//         // Increment new printer type count
//         await prisma.printerType.update({
//           where: { id: newCategory.printerTypeId },
//           data: { printerCount: { increment: 1 } },
//         });
//       }

//       // Merge existing images with newly uploaded ones (if any)
//       const updatedImages = product.images.concat(imageNames);

//       // Update product data
//       const updatedProduct = await prisma.product.update({
//         where: { id: Number(id) },
//         data: {
//           name,
//           description,
//           lastPrice: parsedLastPrice,
//           currentPrice: parsedCurrentPrice,
//           specifications,
//           images: updatedImages,  // Save the updated images array
//           isFeatured: parsedIsFeatured,
//           stockQuantity: parsedStockQuantity,
//           categoryId: parsedCategoryId,
//         },
//       });

//       res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
//     } catch (err) {
//       console.error('Update Product Error:', err);
//       res.status(500).json({ message: 'Server error' });
//     }
//   });
// };

// export const updateProduct = async (req: Request, res: Response) => {
//   upload(req, res, async (err) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: err.message });
//     } else if (err) {
//       return res.status(400).json({ message: err.message });
//     }

//     const { error } = productSchema.validate(req.body);
//     if (error) return res.status(400).json({ message: error.details[0].message });

//     const { id } = req.params;
//     let { name, description, lastPrice, currentPrice, specifications, isFeatured, categoryId, stockQuantity } = req.body;

//     const parsedLastPrice = parseFloat(lastPrice);
//     const parsedCurrentPrice = parseFloat(currentPrice);
//     const parsedStockQuantity = parseInt(stockQuantity || "0", 10);
//     const parsedCategoryId = parseInt(categoryId, 10);
//     const parsedIsFeatured = isFeatured === true || isFeatured === "true";

//     // Get image names from uploaded files
//     const imageNames = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];

//     try {
//       // Check if product exists
//       const product = await prisma.product.findUnique({ where: { id: Number(id) } });
//       if (!product) return res.status(404).json({ message: 'Product not found' });

//       // If categoryId is being updated, check if new category exists and update printer counts
//       if (categoryId && categoryId !== product.categoryId) {
//         const oldCategory = await prisma.category.findUnique({ where: { id: product.categoryId } });
//         const newCategory = await prisma.category.findUnique({ where: { id: parsedCategoryId } });

//         if (!newCategory) return res.status(404).json({ message: 'New category not found' });

//         // Decrement old printer type count
//         await prisma.printerType.update({
//           where: { id: oldCategory!.printerTypeId },
//           data: { printerCount: { decrement: 1 } },
//         });

//         // Increment new printer type count
//         await prisma.printerType.update({
//           where: { id: newCategory.printerTypeId },
//           data: { printerCount: { increment: 1 } },
//         });
//       }

//       // Merge existing images with newly uploaded ones (if any)
//       const updatedImages = product.images ? product.images.concat(imageNames) : imageNames;

//       // Update product data
//       const updatedProduct = await prisma.product.update({
//         where: { id: Number(id) },
//         data: {
//           name,
//           description,
//           lastPrice: parsedLastPrice,
//           currentPrice: parsedCurrentPrice,
//           specifications,
//           images: updatedImages,  // Save the updated images array
//           isFeatured: parsedIsFeatured,
//           stockQuantity: parsedStockQuantity,
//           categoryId: parsedCategoryId,
//         },
//       });

//       res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
//     } catch (err) {
//       console.error('Update Product Error:', err);
//       res.status(500).json({ message: 'Server error' });
//     }
//   });
// };

// export const updateProduct = async (req: Request, res: Response) => {
//   upload(req, res, async (err) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: err.message });
//     } else if (err) {
//       return res.status(400).json({ message: err.message });
//     }

//     const { error } = productSchema.validate(req.body);
//     if (error) return res.status(400).json({ message: error.details[0].message });

//     const { id } = req.params;
//     let { name, description, lastPrice, currentPrice, specifications, isFeatured, categoryId, stockQuantity, existingImages } = req.body;

//     // Parse numeric and boolean values
//     const parsedLastPrice = parseFloat(lastPrice);
//     const parsedCurrentPrice = parseFloat(currentPrice);
//     const parsedStockQuantity = parseInt(stockQuantity || "0", 10);
//     const parsedCategoryId = parseInt(categoryId, 10);
//     const parsedIsFeatured = isFeatured === true || isFeatured === "true";

//     // Parse specifications from JSON string if needed
//     let parsedSpecifications = specifications;
//     if (typeof specifications === 'string') {
//       try {
//         parsedSpecifications = JSON.parse(specifications);
//       } catch (e) {
//         console.error("Error parsing specifications:", e);
//         // Keep original if parsing fails
//       }
//     }

//     // Get image names from newly uploaded files
//     const newImageNames = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];
    
//     // Parse existing images if provided as a JSON string
//     let parsedExistingImages: string[] = [];
//     if (existingImages) {
//       try {
//         parsedExistingImages = JSON.parse(existingImages);
//       } catch (e) {
//         console.error("Error parsing existing images:", e);
//       }
//     }

//     try {
//       // Check if product exists
//       const product = await prisma.product.findUnique({ where: { id: Number(id) } });
//       if (!product) return res.status(404).json({ message: 'Product not found' });

//       // If categoryId is being updated, check if new category exists and update printer counts
//       if (categoryId && categoryId !== product.categoryId) {
//         const oldCategory = await prisma.category.findUnique({ where: { id: product.categoryId } });
//         const newCategory = await prisma.category.findUnique({ where: { id: parsedCategoryId } });

//         if (!newCategory) return res.status(404).json({ message: 'New category not found' });

//         // Decrement old printer type count
//         await prisma.printerType.update({
//           where: { id: oldCategory!.printerTypeId },
//           data: { printerCount: { decrement: 1 } },
//         });

//         // Increment new printer type count
//         await prisma.printerType.update({
//           where: { id: newCategory.printerTypeId },
//           data: { printerCount: { increment: 1 } },
//         });
//       }

//       // Merge existing images with newly uploaded ones
//       const updatedImages = parsedExistingImages.concat(newImageNames);

//       // Update product data
//       const updatedProduct = await prisma.product.update({
//         where: { id: Number(id) },
//         data: {
//           name,
//           description,
//           lastPrice: parsedLastPrice,
//           currentPrice: parsedCurrentPrice,
//           specifications: parsedSpecifications,
//           images: updatedImages,
//           isFeatured: parsedIsFeatured,
//           stockQuantity: parsedStockQuantity,
//           categoryId: parsedCategoryId,
//         },
//       });

//       res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
//     } catch (err) {
//       console.error('Update Product Error:', err);
//       res.status(500).json({ message: 'Server error' });
//     }
//   });
// };

// export const updateProduct = async (req: Request, res: Response) => {
//   upload(req, res, async (err) => {
//     if (err instanceof multer.MulterError) {
//       return res.status(400).json({ message: err.message });
//     } else if (err) {
//       return res.status(400).json({ message: err.message });
//     }

//     const { id } = req.params;
    
//     try {
//       // Check if product exists first
//       const existingProduct = await prisma.product.findUnique({ 
//         where: { id: Number(id) } 
//       });
      
//       if (!existingProduct) {
//         return res.status(404).json({ message: 'Product not found' });
//       }

//       // Extract and validate form data
//       let { 
//         name, 
//         description, 
//         lastPrice, 
//         currentPrice, 
//         specifications, 
//         isFeatured, 
//         categoryId, 
//         stockQuantity, 
//         existingImages 
//       } = req.body;

//       // Validate the required fields
//       const { error } = productSchema.validate({
//         name,
//         description,
//         lastPrice,
//         currentPrice,
//         stockQuantity,
//         specifications: typeof specifications === 'string' ? JSON.parse(specifications) : specifications,
//         categoryId
//       });
      
//       if (error) {
//         return res.status(400).json({ message: error.details[0].message });
//       }

//       // Parse numeric and boolean values
//       const parsedLastPrice = parseFloat(lastPrice);
//       const parsedCurrentPrice = parseFloat(currentPrice);
//       const parsedStockQuantity = parseInt(stockQuantity || "0", 10);
//       const parsedCategoryId = parseInt(categoryId, 10);
//       const parsedIsFeatured = isFeatured === true || isFeatured === "true";

//       // Parse specifications from JSON string if needed
//       let parsedSpecifications = specifications;
//       if (typeof specifications === 'string') {
//         try {
//           parsedSpecifications = JSON.parse(specifications);
//         } catch (e) {
//           console.error("Error parsing specifications:", e);
//           return res.status(400).json({ message: 'Invalid specifications format. Must be a valid JSON object.' });
//         }
//       }

//       // Get image names from newly uploaded files
//       const newImageNames = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];
      
//       // Parse existing images if provided as a JSON string
//       let parsedExistingImages: string[] = existingProduct.images || [];
//       if (existingImages) {
//         try {
//           parsedExistingImages = JSON.parse(existingImages);
//         } catch (e) {
//           console.error("Error parsing existing images:", e);
//           return res.status(400).json({ message: 'Invalid existing images format. Must be a valid JSON array.' });
//         }
//       }

//       // If categoryId is being updated, check if new category exists and update printer counts
//       if (parsedCategoryId !== existingProduct.categoryId) {
//         const newCategory = await prisma.category.findUnique({ 
//           where: { id: parsedCategoryId } 
//         });
        
//         if (!newCategory) {
//           return res.status(404).json({ message: 'New category not found' });
//         }

//         // Handle printer count updates if needed
//         const oldCategory = await prisma.category.findUnique({ 
//           where: { id: existingProduct.categoryId } 
//         });
        
//         // Ensure we only update printer counts if both categories have a printerTypeId
//         if (oldCategory?.printerTypeId && newCategory.printerTypeId) {
//           // Decrement old printer type count
//           await prisma.printerType.update({
//             where: { id: oldCategory.printerTypeId },
//             data: { printerCount: { decrement: 1 } },
//           });

//           // Increment new printer type count
//           await prisma.printerType.update({
//             where: { id: newCategory.printerTypeId },
//             data: { printerCount: { increment: 1 } },
//           });
//         }
//       }

//       // Merge existing images with newly uploaded ones
//       const updatedImages = parsedExistingImages.concat(newImageNames);

//       // Update product data
//       const updatedProduct = await prisma.product.update({
//         where: { id: Number(id) },
//         data: {
//           name,
//           description,
//           lastPrice: parsedLastPrice,
//           currentPrice: parsedCurrentPrice,
//           specifications: parsedSpecifications,
//           images: updatedImages,
//           isFeatured: parsedIsFeatured,
//           stockQuantity: parsedStockQuantity,
//           categoryId: parsedCategoryId,
//         },
//       });

//       res.status(200).json({ 
//         message: 'Product updated successfully', 
//         product: updatedProduct 
//       });
//     } catch (err) {
//       console.error('Update Product Error:', err);
//       res.status(500).json({ 
//         message: 'Server error while updating product. Please try again.' 
//       });
//     }
//   });
// };

export const updateProduct = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { id } = req.params;
    
    try {
      // Check if product exists first
      const existingProduct = await prisma.product.findUnique({ 
        where: { id: Number(id) } 
      });
      
      if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Extract and validate form data
      const { 
        name, 
        description, 
        lastPrice, 
        currentPrice, 
        specifications, 
        isFeatured, 
        categoryId, 
        stockQuantity, 
        existingImages 
      } = req.body;

      // Validate the required fields
      let parsedSpecifications = specifications;
      if (typeof specifications === 'string') {
        try {
          parsedSpecifications = JSON.parse(specifications);
        } catch (e) {
          console.error("Error parsing specifications:", e);
          return res.status(400).json({ message: 'Invalid specifications format. Must be a valid JSON object.' });
        }
      }

      const { error } = productSchema.validate({
        name,
        description,
        lastPrice,
        currentPrice,
        stockQuantity,
        specifications: parsedSpecifications,
        categoryId
      });
      
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      // Parse numeric and boolean values
      const parsedLastPrice = parseFloat(lastPrice);
      const parsedCurrentPrice = parseFloat(currentPrice);
      const parsedStockQuantity = parseInt(stockQuantity || "0", 10);
      const parsedCategoryId = parseInt(categoryId, 10);
      const parsedIsFeatured = isFeatured === true || isFeatured === "true";

      // Get image names from newly uploaded files
      const newImageNames = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];
      
      // Parse existing images if provided as a JSON string
      let parsedExistingImages: string[] = existingProduct.images || [];
      if (existingImages) {
        try {
          parsedExistingImages = JSON.parse(existingImages);
        } catch (e) {
          console.error("Error parsing existing images:", e);
          return res.status(400).json({ message: 'Invalid existing images format. Must be a valid JSON array.' });
        }
      }

      // If categoryId is being updated, check if new category exists and update printer counts
      if (parsedCategoryId !== existingProduct.categoryId) {
        const newCategory = await prisma.category.findUnique({ 
          where: { id: parsedCategoryId } 
        });
        
        if (!newCategory) {
          return res.status(404).json({ message: 'New category not found' });
        }

        // Handle printer count updates if needed
        const oldCategory = await prisma.category.findUnique({ 
          where: { id: existingProduct.categoryId } 
        });
        
        // Ensure we only update printer counts if both categories have a printerTypeId
        if (oldCategory?.printerTypeId && newCategory.printerTypeId) {
          // Decrement old printer type count
          await prisma.printerType.update({
            where: { id: oldCategory.printerTypeId },
            data: { printerCount: { decrement: 1 } },
          });

          // Increment new printer type count
          await prisma.printerType.update({
            where: { id: newCategory.printerTypeId },
            data: { printerCount: { increment: 1 } },
          });
        }
      }

      // Merge existing images with newly uploaded ones
      const updatedImages = parsedExistingImages.concat(newImageNames);

      // Update product data
      const updatedProduct = await prisma.product.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          lastPrice: parsedLastPrice,
          currentPrice: parsedCurrentPrice,
          specifications: parsedSpecifications,
          images: updatedImages,
          isFeatured: parsedIsFeatured,
          stockQuantity: parsedStockQuantity,
          categoryId: parsedCategoryId,
        },
        include: {
          category: true,
        }
      });

      res.status(200).json({ 
        message: 'Product updated successfully', 
        product: {
          ...updatedProduct,
          category: updatedProduct.category.name
        }
      });
    } catch (err) {
      console.error('Update Product Error:', err);
      res.status(500).json({ 
        message: 'Server error while updating product. Please try again.' 
      });
    }
  });
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
// export const deleteProduct = async (req: Request, res: Response) => {
//   // Assuming you have admin middleware to protect this route
//   const { id } = req.params;

//   try {
//     // Check if product exists
//     const product = await prisma.product.findUnique({ where: { id: Number(id) } });
//     if (!product) return res.status(404).json({ message: 'Product not found' });

//     // Delete the product
//     await prisma.product.delete({ where: { id: Number(id) } });

//     // Decrement printer count if applicable
//     const category = await prisma.category.findUnique({ where: { id: product.categoryId } });
//     if (category) {
//       await prisma.printerType.update({
//         where: { id: category.printerTypeId },
//         data: { printerCount: { decrement: 1 } },
//       });
//     }

//     res.status(200).json({ message: 'Product deleted successfully' });
//   } catch (err) {
//     console.error('Delete Product Error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


import fs from 'fs';

// Helper function to delete image files
const deleteProductImages = (images: string[]) => {
  images.forEach(imageName => {
    // Only delete local images (not external URLs)
    if (!imageName.startsWith('http')) {
      const imagePath = path.join(__dirname, '../../uploads', imageName);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Deleted image: ${imagePath}`);
        }
      } catch (err) {
        console.error(`Error deleting image ${imagePath}:`, err);
      }
    }
  });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const productId = Number(id);

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ 
      where: { id: productId } 
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is referenced in other tables
    const cartItems = await prisma.cartItem.findMany({
      where: { productId: productId }
    });

    const orderItems = await prisma.orderItem.findMany({
      where: { productId: productId }
    });

    const wishlistItems = await prisma.wishlist.findMany({
      where: { productId: productId }
    });

    // If product is referenced, return an appropriate message
    if (cartItems.length > 0) {
      return res.status(400).json({ 
        message: 'This product is in active shopping carts and cannot be deleted. Consider marking it as out of stock instead.' 
      });
    }

    if (orderItems.length > 0) {
      return res.status(400).json({ 
        message: 'This product is associated with completed orders and cannot be deleted for record-keeping purposes. Consider marking it as out of stock instead.' 
      });
    }

    // For wishlist items, we can choose to delete them along with the product
    if (wishlistItems.length > 0) {
      await prisma.wishlist.deleteMany({
        where: { productId: productId }
      });
      console.log(`Deleted ${wishlistItems.length} wishlist items for product ${productId}`);
    }

    // Delete associated image files
    if (product.images && product.images.length > 0) {
      deleteProductImages(product.images);
    }

    // Delete the product
    await prisma.product.delete({ where: { id: productId } });

    // Update printer count if applicable
    const category = await prisma.category.findUnique({ 
      where: { id: product.categoryId } 
    });
    
    if (category?.printerTypeId) {
      await prisma.printerType.update({
        where: { id: category.printerTypeId },
        data: { printerCount: { decrement: 1 } },
      });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete Product Error:', err);
    res.status(500).json({ 
      message: 'Server error while deleting product. Please try again.' 
    });
  }
};
