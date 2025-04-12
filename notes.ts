// npx prisma migrate dev --name update_product_specifications_and_images
// npx prisma generate

// for new db 
// npx prisma generate
// Then 
// npx prisma migrate dev


// https://claude.ai/chat/7def36ac-76aa-426b-a680-ccb557ce01b6
// https://chatgpt.com/c/67f68c02-ec10-8010-b99b-4fa21f8989c6



// From this url what files should be here to return the appropriete result 
// Here is the url - const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback';
// it has been used in the following code snippet -
// 1. in the initializeMpesaC2B function, the callback URL is used to specify where the MPESA API should send the payment confirmation after the transaction is completed. 
// export const initializeMpesaC2B = async (req: Request, res: Response): Promise<void> => {
//     try {
//       const token = await getMpesaToken();
      
//       const response = await axios.post(
//         MPESA_C2B_REGISTER_URL,
//         {
//           ShortCode: MPESA_SHORTCODE,
//           ResponseType: 'Completed',
//           ConfirmationURL: `${process.env.API_BASE_URL}/api/mpesa/c2b/confirmation`,
//           ValidationURL: `${process.env.API_BASE_URL}/api/mpesa/c2b/validation`,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );
      
//       res.status(200).json({
//         message: 'M-Pesa C2B URLs registered successfully',
//         data: response.data,
//       });
//     } catch (error) {
//       console.error('Error initializing M-Pesa C2B:', error);
//       res.status(500).json({ message: 'Error initializing M-Pesa C2B' });
//     }
//   };

// 2. in the initiateSTKPush function, the callback URL is used to specify where the MPESA API should send the payment confirmation after the transaction is completed.
// MPESA_STK_PUSH_URL,
//       {
//         BusinessShortCode: MPESA_SHORTCODE,
//         Password: password,
//         Timestamp: timestamp,
//         TransactionType: 'CustomerPayBillOnline',
//         Amount: amount,
//         PartyA: formattedPhone,
//         PartyB: MPESA_SHORTCODE,
//         PhoneNumber: formattedPhone,
//         CallBackURL: `${MPESA_CALLBACK_URL}/stk`,
//         AccountReference: reference,
//         TransactionDesc: `Payment for Order #${order.orderNumber}`,
//       },

// 3. in the topUpWallet function, the callback URL is used to specify where the MPESA API should send the payment confirmation after the transaction is completed.
// MPESA_STK_PUSH_URL,
//       {
//         BusinessShortCode: MPESA_SHORTCODE,
//         Password: password,
//         Timestamp: timestamp,
//         TransactionType: 'CustomerPayBillOnline',
//         Amount: amount,
//         PartyA: formattedPhone,
//         PartyB: MPESA_SHORTCODE,
//         PhoneNumber: formattedPhone,
//         CallBackURL: `${MPESA_CALLBACK_URL}/wallet-topup`,
//         AccountReference: reference,
//         TransactionDesc: `Wallet Top-up for User #${userId}`,
//       },
// 4. in the processRefundRequest function, the callback URL is used to specify where the MPESA API should send the payment confirmation after the transaction is completed.
// MPESA_B2C_URL,
//           {
//             InitiatorName: process.env.MPESA_INITIATOR_NAME,
//             SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL, // Generated from Safaricom portal
//             CommandID: 'BusinessPayment',
//             Amount: refundRequest.amount,
//             PartyA: MPESA_SHORTCODE,
//             PartyB: formattedPhone,
//             Remarks: `Refund for Order #${order.orderNumber}`,
//             QueueTimeOutURL: `${process.env.API_BASE_URL}/api/mpesa/b2c/timeout`,
//             ResultURL: `${process.env.API_BASE_URL}/api/mpesa/b2c/result`,
//             Occasion: `OrderRefund-${refundRequest.id}`,
//           },
// 5. in the checkMerchantBalance function, the callback URL is used to specify where the MPESA API should send the payment confirmation after the transaction is completed.
// MPESA_ACCOUNT_BALANCE_URL,
//       {
//         Initiator: process.env.MPESA_INITIATOR_NAME,
//         SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
//         CommandID: 'AccountBalance',
//         PartyA: MPESA_SHORTCODE,
//         IdentifierType: '4', // Shortcode
//         Remarks: 'Account balance query',
//         QueueTimeOutURL: `${process.env.API_BASE_URL}/api/mpesa/accountbalance/timeout`,
//         ResultURL: `${process.env.API_BASE_URL}/api/mpesa/accountbalance/result`,
//       },
// 6. 








i want you to learn something about this page. they have created a really nice animated loading. i need you to use it in my page::
HERE IS THE PAGES TO USE IN::
SHOP
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductGrid from '../components/shop/ProductGrid';
import SortingDropdown from '../components/shop/SortingDropdown';
import { LoadingState, ErrorState, EmptyState } from '../components/shop/ShopStates';
import { useProductFetch } from '../features/shop/useProductFetch';
import { useSearchParamsHandler } from '../features/shop/useSearchParamsHandler';
import PrinterTypesSidebar from '../components/Printers/PrinterTypesSidebar';
import ShopHeader from '../components/Printers/ShopHeader';
import PaginationControls from '../components/Printers/PaginationControls';

const Shop: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { updateSearchParams } = useSearchParamsHandler();
  const { products, totalPages, loading, error } = useProductFetch();

  const sortOption = searchParams.get('sort') || 'default';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const handleSortChange = (e: React.ChangeEvent) => {
    const sortVal = e.target.value;
    updateSearchParams({
      sort: sortVal === 'default' ? '' : sortVal,
      page: '1'
    });
  };

  const handleSearch = (query: string) => {
    const currentSearch = searchParams.get('search') || '';
    if (query !== currentSearch) {
      updateSearchParams({ 
        search: query, 
        page: '1' 
      });
    }
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page: page.toString() });
  };

  if (loading && products.length === 0) {
    return ;
  }

  return (
    
      
      
      


        


          
          
          


            


              

Printers


              
            



            {loading ? (
              
            ) : error ? (
              
            ) : products.length === 0 ? (
              
            ) : (
              <>
                
                
              
            )}
          


        


      


    
  );
};

export default Shop;
import React from 'react';
import { Product } from '../../types/product';
import ProductCard from '../Printers/ProductCard';

const ProductGrid: React.FC<{ products: Product[] }> = ({ products }) => (
  


    {products.map((product) => (
      


        
      


    ))}
  


);

export default React.memo(ProductGrid);
import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../../styles/ProductCard.module.css';
import { Product } from '../../types/product';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC = ({ product }) => {
  const discountPercentage = Math.round(
    ((product.lastPrice - product.currentPrice) / product.lastPrice) * 100
  );

  return (
    


      {discountPercentage > 0 && (
        
          -{discountPercentage}%
        
      )}
      
        
        


          

{product.name}


          


            
              KSh {product.lastPrice.toLocaleString()}.00
            {' '}
            KSh {product.currentPrice.toLocaleString()}.00
          


        


      
    


  );
};

export default ProductCard;

import { useCallback, useEffect, useState } from 'react'; import { useLocation } from 'react-router-dom'; import axios from 'axios'; import { Product, ProductsResponse, CategoryResponse } from '../../types/product'; import productAPI from '../../api/product';  export const useProductFetch = () => {   const location = useLocation();   const [products, setProducts] = useState([]);   const [totalPages, setTotalPages] = useState(1);   const [loading, setLoading] = useState(true);   const [error, setError] = useState('');   const [cache, setCache] = useState<{ [key: string]: { products: Product[]; totalPages: number } }>({});    const fetchProducts = useCallback(async () => {     setError('');      const searchParams = new URLSearchParams(location.search);      const sortOption = searchParams.get('sort') || 'default';     const searchQuery = searchParams.get('search') || '';     const selectedCategory = searchParams.get('category') || '';     const currentPage = parseInt(searchParams.get('page') || '1', 10);     const productsPerPage = 10;       let sortParam = getSortParam(sortOption);      const cacheKey = `${selectedCategory || 'all'}-${sortParam || 'default'}-${searchQuery || 'all'}-${currentPage}`;      if (cache[cacheKey]) {       setProducts(cache[cacheKey].products);       setTotalPages(cache[cacheKey].totalPages);       return;     }      setLoading(true);     try {       let url = '';       if (selectedCategory) {         url = `${productAPI.CATEGORIES}/${selectedCategory}?search=${encodeURIComponent(searchQuery)}`;       } else {         url = productAPI.ALL_PRODUCTS(           currentPage,           productsPerPage,           sortParam,           searchQuery,           undefined         );       }        const response = await axios.get(url);        let fetchedProducts: Product[] = [];       let fetchedTotalPages = 1;        if (selectedCategory) {         const categoryResponse = response.data as CategoryResponse;         fetchedProducts = categoryResponse.category.products;       } else {         const productsResponse = response.data as ProductsResponse;         fetchedProducts = productsResponse.products;         fetchedTotalPages = productsResponse.totalPages;       }        setProducts(fetchedProducts);       setTotalPages(fetchedTotalPages);       setCache((prevCache) => ({         ...prevCache,         [cacheKey]: { products: fetchedProducts, totalPages: fetchedTotalPages },       }));     } catch (err) {       setError('Failed to fetch products. Please try again later.');     } finally {       setLoading(false);     }   }, [location.search]);    useEffect(() => {     fetchProducts();   }, [location.search, fetchProducts]);    return { products, totalPages, loading, error }; };  const getSortParam = (sortOption: string) => {   if (sortOption === 'price-low-high') return 'price-low-high';   if (sortOption === 'price-high-low') return 'price-high-low';   if (sortOption === 'latest') return 'latest';   return ''; };|

import React from 'react';

const SortingDropdown: React.FC<{
  sortOption: string;
  onSortChange: (e: React.ChangeEvent) => void;
}> = ({ sortOption, onSortChange }) => {
  return (
    


       {
          onSortChange(e);
        }}
      >
        Default sorting
        Price - Low to High
        Price - High to Low
        Latest Arrivals
      
    


  );
};

export default React.memo(SortingDropdown);

import React from 'react';

export const LoadingState: React.FC = () => (
  


    


      Loading...
    


  


);

export const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  


    {error}
  


);

export const EmptyState: React.FC = () => (
  


    No products found.
  


);
import { useSearchParams } from 'react-router-dom';

export const useSearchParamsHandler = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateSearchParams = (params: { [key: string]: string }) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      value ? newParams.set(key, value) : newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  return { updateSearchParams };
};
import React, { useEffect, useState } from 'react';
import styles from '../../styles/PrinterTypesSidebar.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../api/main';

interface PrinterType {
  id: number;
  name: string;
  printerCount: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
  images: string[];
  printerTypeId: number;
}

const PrinterTypesSidebar: React.FC = () => {
  const [printerTypes, setPrinterTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedTypes, setExpandedTypes] = useState([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchPrinterTypes = async () => {
      try {
        const response = await axios.get<{ printerTypes: PrinterType[] }>(
          `${API_BASE_URL}/printer-types?page=1&limit=100`
        );
        setPrinterTypes(response.data.printerTypes);
      } catch (error) {
        console.error("Error fetching printer types:", error);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await axios.get<{ categories: Category[] }>(
          `${API_BASE_URL}/categories?page=1&limit=100`
        );
        setCategories(response.data.categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchPrinterTypes();
    fetchCategories();
  }, []);

  const toggleExpand = (typeId: number) => {
    setExpandedTypes(prev => 
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    );
  };

  const selectedCategory = searchParams.get('category') || '';

  const groupedCategories = printerTypes.map(type => ({
    ...type,
    categories: categories.filter(cat => cat.printerTypeId === type.id)
  }));

  return (
    


      

Printer Types


      


        {groupedCategories.map(type => (
          


            

 toggleExpand(type.id)}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-expanded={expandedTypes.includes(type.id)}
              aria-controls={`categories-${type.id}`}
            >
              
                {type.name} ({type.printerCount})
              
              
                {expandedTypes.includes(type.id) ? '-' : '+'}
              
            


            {expandedTypes.includes(type.id) && (
              


                {type.categories.map(category => (
                  


                    
                      {category.name}
                    
                  


                ))}
              


            )}
          


        ))}
      


    


  );
};

export default PrinterTypesSidebar;
import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/ShopHeader.module.css';
import { useSearchParams } from 'react-router-dom';
import debounce from 'lodash.debounce';

interface ShopHeaderProps {
  onSearch: (query: string) => void;
}

const ShopHeader: React.FC = ({ onSearch }) => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);


  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query.trim());
    }, 500),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    debouncedSearch.cancel();
    onSearch(searchQuery.trim());
  };

  return (
    


      


        


           {
              setSearchQuery(e.target.value);
            }}
          />
        


      


    


  );
};

export default ShopHeader;

import React from 'react';
import styles from '../../styles/PaginationControls.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = startPage + maxPageButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        


           handlePageClick(i, e)}>
            {i}
          
        


      );
    }

    return pages;
  };

  return (
    


      


        


          
            Previous
          
        


        {renderPageNumbers()}
        


          
            Next
          
        


      


    


  );
};

export default PaginationControls;