// API Route: /api/decrypt
// Decrypts data using server-side encryption key

// Helper to convert Base64 string to ArrayBuffer
const base64ToBuffer = (base64) => {
    return Buffer.from(base64, 'base64');
};

// Server-side encryption key (secure - not exposed to browser)
const getEncryptionKey = () => {
    return process.env.ENCRYPTION_KEY;
};

// Internal function to derive the app's encryption key
const deriveEncryptionKey = async (salt) => {
    const { webcrypto } = await import('crypto');
    const crypto = webcrypto;

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(getEncryptionKey()),
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
 * Decrypts data using the server-side encryption key
 */
const decryptWithAppSecret = async (encryptedPayload) => {
    const { webcrypto } = await import('crypto');
    const crypto = webcrypto;

    const salt = base64ToBuffer(encryptedPayload.salt);
    const iv = base64ToBuffer(encryptedPayload.iv);
    const data = base64ToBuffer(encryptedPayload.ciphertext);

    const key = await deriveEncryptionKey(new Uint8Array(salt));

    const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
};

/**
 * Verifies a password against a known SHA-256 hash
 */
const verifyUserPassword = async (password, hash) => {
    if (!hash) return password === hash;

    const { webcrypto } = await import('crypto');
    const crypto = webcrypto;

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const newHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return newHash === hash;
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
    }

    try {
        const { encryptedData, password } = req.body;

        if (!encryptedData) {
            res.status(400).json({ error: 'Encrypted data is required for decryption.' });
            return;
        }

        // Validate required encrypted data structure
        if (!encryptedData.salt || !encryptedData.iv || !encryptedData.ciphertext) {
            res.status(400).json({ error: 'Invalid encrypted data format.' });
            return;
        }

        // Decrypt the data first
        const decryptedText = await decryptWithAppSecret(encryptedData);

        // Try to parse as JSON, fallback to plain text
        let decryptedData;
        try {
            decryptedData = JSON.parse(decryptedText);
        } catch {
            decryptedData = decryptedText;
        }

        // Check if the decrypted data contains a password hash
        if (decryptedData && typeof decryptedData === 'object' && decryptedData.passwordHash) {
            // If password hash exists, verify the password
            if (!password) {
                res.status(401).json({ error: 'Password is required for this encrypted file.' });
                return;
            }

            const isValidPassword = await verifyUserPassword(password, decryptedData.passwordHash);
            if (!isValidPassword) {
                res.status(401).json({ error: 'Invalid password provided.' });
                return;
            }

            // Remove the password hash from the data before returning it
            const { passwordHash, ...dataWithoutPassword } = decryptedData;
            res.status(200).json({ data: dataWithoutPassword });
        } else {
            // No password protection, return data as is
            res.status(200).json({ data: decryptedData });
        }
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(500).json({ error: 'Decryption failed. Invalid data or corrupted file.' });
    }
}