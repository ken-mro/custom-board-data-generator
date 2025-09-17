// --- Crypto Service Logic ---
export interface EncryptedData {
    salt: string; // base64
    iv: string; // base64
    ciphertext: string; // base64
}

// Helper to convert ArrayBuffer to Base64 string
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
};

// Helper to convert Base64 string to ArrayBuffer
const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};


// This key is used for the outer encryption layer.
// In a real application, this should be managed more securely (e.g., via environment variables),
// but for this context, a hardcoded constant is sufficient.
const encryptionKey = process.env.ENCRYPTION_KEY;

// Internal function to derive the app's encryption key
const getEncryptionKey = async (salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(encryptionKey),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypts data using the hardcoded application secret key.
 * @param plainText The string content to encrypt.
 * @returns An object containing the salt, iv, and ciphertext as base64 strings.
 */
export const encryptWithAppSecret = async (plainText: string): Promise<EncryptedData> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await getEncryptionKey(salt);

    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );

    return {
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
        ciphertext: bufferToBase64(encryptedContent),
    };
};

/**
 * Decrypts data using the hardcoded application secret key.
 * @param encryptedPayload An object containing the salt, iv, and ciphertext.
 * @returns The decrypted string content.
 */
export const decryptWithAppSecret = async (encryptedPayload: EncryptedData): Promise<string> => {
    const salt = base64ToBuffer(encryptedPayload.salt);
    const iv = base64ToBuffer(encryptedPayload.iv);
    const data = base64ToBuffer(encryptedPayload.ciphertext);

    const key = await getEncryptionKey(new Uint8Array(salt));

    const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
};

// --- Functions for user password hashing ---

const bufferToHexString = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Hashes a user-provided password using SHA-256.
 * @param password The password to hash.
 * @returns A hex string representation of the hash.
 */
export const hashUserPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHexString(hashBuffer);
};

/**
 * Verifies a password against a known SHA-256 hash.
 * @param password The password to verify.
 * @param hash The hex string hash to compare against.
 * @returns A boolean indicating if the password matches the hash.
 */
export const verifyUserPassword = async (password: string, hash: string): Promise<boolean> => {
    const newHash = await hashUserPassword(password);
    return newHash === hash;
};
