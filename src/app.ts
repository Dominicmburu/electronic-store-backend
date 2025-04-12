import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOptions from './config/cors';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import contactRoutes from './routes/contactRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reviewRoutes from './routes/reviewRoutes';
import settingsRoutes from './routes/settingsRoutes';
import shopRoutes from './routes/shopRoutes';
import userRoutes from './routes/userRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import { errorHandler } from './middlewares/errorMiddleware';
import adminRoutes from './routes/adminRoutes';
import categoryRoutes from './routes/categoryRoutes';
import printerTypeRouter from './routes/printerTypeRouter';
import addressRoutes from './routes/addressRoutes';
import mpesaRoutes from './routes/mpesaRoutes';

const app = express();
// import { createClient } from '@supabase/supabase-js';

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Server is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/printer-types', printerTypeRouter);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/mpesa', mpesaRoutes);

app.use(errorHandler);

export default app;
