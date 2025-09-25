// API Route: /api/encrypt
// Encrypts data using server-side encryption key

// Helper to convert ArrayBuffer to Base64 string
const bufferToBase64 = (buffer) => {
    return Buffer.from(buffer).toString('base64');
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
 * Encrypts data using the server-side encryption key
 */
const encryptWithAppSecret = async (plainText) => {
    const { webcrypto } = await import('crypto');
    const crypto = webcrypto;

    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveEncryptionKey(salt);

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
 * Hashes a user-provided password using SHA-256
 */
const hashUserPassword = async (password) => {
    const { webcrypto } = await import('crypto');
    const crypto = webcrypto;

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
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
        const { data, password } = req.body;

        if (!data) {
            res.status(400).json({ error: 'Data is required for encryption.' });
            return;
        }

        // Parse data if it's a string, otherwise use as object
        let jsonData = typeof data === 'string' ? JSON.parse(data) : data;

        // If password is provided, add password hash to the JSON data before encryption
        if (password) {
            const passwordHash = await hashUserPassword(password);
            jsonData = { ...jsonData, passwordHash };
        }

        // Convert modified data to string for encryption
        const dataToEncrypt = JSON.stringify(jsonData);

        // Encrypt the data (now including password hash if provided)
        const encryptedPayload = await encryptWithAppSecret(dataToEncrypt);

        // Return the encrypted payload (password hash is now encrypted within the data)
        res.status(200).json({ encrypted: encryptedPayload });
    } catch (error) {
        console.error('Encryption error:', error);
        res.status(500).json({ error: 'Encryption failed. Please try again.' });
    }
}