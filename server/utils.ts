import { customAlphabet } from 'nanoid';

// Create a URL-safe alphabet for our slugs (excluding similar-looking characters)
const alphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
const generateSlug = customAlphabet(alphabet, 10);

export { generateSlug };
