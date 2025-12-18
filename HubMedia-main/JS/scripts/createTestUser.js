require('dotenv').config();
const UserModel = require('../models/UserModel');

async function createTestUser() {
    try {
        const user = await UserModel.createUser({
            full_name: 'Test User',
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123'
        });
        
        console.log('Test user created with ID:', user);
    } catch (error) {
        console.error('Error creating test user:', error);
    }
    process.exit(0);
}

createTestUser();
