import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

const config = {
    PORT: process.env.BACKEND_PORT || 3000,
    backendURL: process.env.BACKEND_URL || "undefined"
};
export default config;
