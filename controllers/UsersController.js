import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');
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

  async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const value = await redisClient.get(key);
    if (value) {
      const user = await dbClient.client.db(dbClient.database).collection('users').findOne({ _id: ObjectId(value) });
      return res.status(200).json({ id: user._id.toString(), email: user.email });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  },
};

export default UserController;
