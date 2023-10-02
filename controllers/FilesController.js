import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
const dbClient = require('../utils/db');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload(req, res) {
    const {
      name, type, parentId, isPublic, data,
    } = req.body;
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const value = await redisClient.get(key);

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId) {
      const parentFile = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    try {
      let fileId;
      if (type === 'file' || type === 'image') {
        const fileData = Buffer.from(data, 'base64');
        fileId = new ObjectId();
        const filePath = path.join(FOLDER_PATH, fileId.toString());
        fs.writeFileSync(filePath, fileData);
      }

      const file = {
        userId: ObjectId(value),
        name,
        type,
        parentId: parentId ? ObjectId(parentId) : 0,
        isPublic: isPublic || false,
        localPath: type === 'file' || type === 'image' ? path.join(FOLDER_PATH, fileId.toString()) : null,
      };

      const result = await dbClient.client.db(dbClient.database).collection('files').insertOne(file);

      return res.status(201).json({
        id: result.insertedId,
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId.toString(),
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getShow(req, res) {
    const token 
  },

  async getIndex(req, res) {

  },
};

export default FilesController;
