import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

const config = {
    PORT: process.env.BACKEND_PORT || 3000,
};
export default config;
