import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

const AuthController = {
  async getConnect(req, res) {
    const authorizationHeader = req.headers.authorization;
    if (authorizationHeader) {
      const authString = authorizationHeader.split(' ')[1];
      const decodeBuffer = Buffer.from(authString, 'base64');
      const decodedEmailAndPw = decodeBuffer.toString('utf-8');
      const [email, password] = decodedEmailAndPw.split(':');
      const existingUser = await dbClient.client.db(dbClient.database).collection('users').findOne({ email, password: sha1(password) });

      if (!existingUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = v4();
      const key = `auth_${token}`;
      const expirationInSeconds = 24 * 60 * 60; // 24 hours
      redisClient.set(key, existingUser._id.toString(), expirationInSeconds);
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  },

  async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (token) {
      const key = `auth_${token}`;
      redisClient.del(key);
      return res.status(204).send();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  },
};

export default AuthController;
