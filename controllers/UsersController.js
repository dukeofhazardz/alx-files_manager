import dbClient from '../utils/db';

const sha1 = require('sha1');

const UserController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const existingUser = await dbClient.client.db(dbClient.database).collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPw = sha1(password);
    const newUser = {
      email,
      password: hashedPw,
    };

    const result = await dbClient.client.db(dbClient.database).collection('users').insertOne(newUser);
    return res.status(201).json({ id: result.insertedId, email: newUser.email });
  },
};

export default UserController;
