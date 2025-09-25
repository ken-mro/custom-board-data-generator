// --- Crypto Service Logic (Now using Vercel Functions for security) ---
export interface EncryptedData {
    salt: string; // base64
    iv: string; // base64
    ciphertext: string; // base64
}

// API base URL - adjust for your deployment
const API_BASE = process.env.NODE_ENV === 'production'
    ? 'https:/https://custom-board-data-generator-izhdeyaa7-ken-mros-projects.vercel.app/api'  // Update with your actual domain
    : '/api';

/**
 * Encrypts data using server-side encryption via Vercel Functions.
 * If password is provided, it will be hashed and added to the data before encryption.
 * @param plainText The string content to encrypt.
 * @param password Optional password to add password protection.
 * @returns An object containing the salt, iv, and ciphertext as base64 strings.
 */
export const encryptWithAppSecret = async (plainText: string, password?: string): Promise<EncryptedData> => {
    try {
        const response = await fetch(`${API_BASE}/encrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                data: plainText, 
                password: password || undefined 
            }),
        });

        if (!response.ok) {
            throw new Error(`Encryption failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data. Please try again.');
    }
};

/**
 * Decrypts data using server-side decryption via Vercel Functions.
 * If the encrypted data contains password protection, password verification is handled automatically.
 * @param encryptedPayload An object containing the salt, iv, and ciphertext.
 * @param password Optional password for password-protected files.
 * @returns The decrypted string content.
 */
export const decryptWithAppSecret = async (encryptedPayload: EncryptedData, password?: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                encryptedData: encryptedPayload,
                password: password || undefined
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid password provided.');
            }
            throw new Error(`Decryption failed: ${response.statusText}`);
        }

        const result = await response.json();
        return typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data. Please check the file and password and try again.');
    }
};