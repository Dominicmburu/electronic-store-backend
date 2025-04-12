import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Generates the M-Pesa security credential by encrypting the initiator password
 * using the provided certificate file.
 * 
 * @param initiatorPassword - The password for the M-Pesa initiator
 * @param certPath - Path to the Safaricom certificate (.cer) file
 * @returns The Base64 encoded security credential
 */
export const generateSecurityCredential = (initiatorPassword: string, certPath: string): string => {
  try {
    // Read the certificate file
    const certFile = fs.readFileSync(path.resolve(certPath));
    
    // Create public key from the certificate
    const publicKey = crypto.createPublicKey({
      key: certFile,
      format: 'der',
      type: 'spki',
    });
    
    // Encrypt the initiator password using the public key
    const encryptedPassword = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(initiatorPassword)
    );
    
    // Return the Base64 encoded encrypted password
    return encryptedPassword.toString('base64');
  } catch (error) {
    console.error('Error generating security credential:', error);
    throw new Error('Failed to generate security credential');
  }
};

/**
 * Creates all required M-Pesa credentials for the application
 * 
 * @param certPath - Path to the Safaricom certificate (.cer) file
 * @param initiatorPassword - The password for the M-Pesa initiator
 * @returns Object containing the security credential
 */
export const generateMpesaCredentials = (certPath: string, initiatorPassword: string) => {
  const securityCredential = generateSecurityCredential(initiatorPassword, certPath);
  
  return {
    securityCredential,
  };
};