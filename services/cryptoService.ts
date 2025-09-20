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
 * @param plainText The string content to encrypt.
 * @returns An object containing the salt, iv, and ciphertext as base64 strings.
 */
export const encryptWithAppSecret = async (plainText: string): Promise<EncryptedData> => {
    try {
        const response = await fetch(`${API_BASE}/encrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: plainText }),
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
 * @param encryptedPayload An object containing the salt, iv, and ciphertext.
 * @returns The decrypted string content.
 */
export const decryptWithAppSecret = async (encryptedPayload: EncryptedData): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ encryptedData: encryptedPayload }),
        });

        if (!response.ok) {
            throw new Error(`Decryption failed: ${response.statusText}`);
        }

        const result = await response.json();
        return typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data. Please check the file and try again.');
    }
};

// --- Functions for user password hashing (now via API) ---

/**
 * Hashes a user-provided password using server-side SHA-256.
 * @param password The password to hash.
 * @returns A hex string representation of the hash.
 */
export const hashUserPassword = async (password: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/encrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: 'temp', password }), // We only need the password hash
        });

        if (!response.ok) {
            throw new Error(`Password hashing failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.passwordHash;
    } catch (error) {
        console.error('Password hashing error:', error);
        throw new Error('Failed to hash password. Please try again.');
    }
};

/**
 * Verifies a password against encrypted data that contains password protection.
 * @param password The password to verify.
 * @param encryptedPayload The encrypted payload that may contain password hash.
 * @param passwordHash The password hash to verify against.
 * @returns A boolean indicating if the password matches.
 */
export const verifyUserPassword = async (password: string, passwordHash: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE}/decrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                encryptedData: { salt: '', iv: '', ciphertext: '' }, // Dummy data
                password,
                passwordHash
            }),
        });

        // If the response is successful, password is correct
        return response.ok;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
};
