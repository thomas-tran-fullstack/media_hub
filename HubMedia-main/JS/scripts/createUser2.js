const db = require('../config/database');
const UserModel = require('../models/UserModel');

(async () => {
  try {
    // Create user2
    const userId = await UserModel.createUser({
      full_name: 'User Two',
      email: 'user2@test.com',
      username: 'user2',
      password: 'password123'
    });
    console.log(`Created user2: ID=${userId}, email=user2@test.com, password=password123`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
