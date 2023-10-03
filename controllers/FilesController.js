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
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const value = await redisClient.get(key);

    if (!value) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = ObjectId(req.params.id);
    const userId = ObjectId(value);
    const file = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
      localPath: file.localPath,
    });
  },

  async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const value = await redisClient.get(key);

    if (!value) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = ObjectId(value);
    const parentId = req.query.parentId ? ObjectId(req.query.parentId) : 0;
    const page = req.query.page ? parseInt(req.query.page, 10) : 0;
    const pageSize = 20;
    const files = await dbClient.client.db(dbClient.database).collection('files').find({ userId, parentId }).skip(page * pageSize)
      .limit(pageSize)
      .toArray();
    const mappedFiles = files.map((file) => ({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
      localPath: file.localPath,
    }));
    return res.status(200).json(mappedFiles);
  },

  async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const value = await redisClient.get(key);

    if (!value) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = ObjectId(value);
    const fileId = ObjectId(req.params.id);
    const isFile = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: fileId, userId });
    if (!isFile) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.client.db(dbClient.database).collection('files').updateOne({ _id: fileId, userId }, { $set: { isPublic: true } });

    const file = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: fileId, userId });
    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
      localPath: file.localPath,
    });
  },

  async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const value = await redisClient.get(key);

    if (!value) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = ObjectId(value);
    const fileId = ObjectId(req.params.id);
    const isFile = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: fileId, userId });
    if (!isFile) {
      return res.status(404).json({ error: 'Not found' });
    }
    await dbClient.client.db(dbClient.database).collection('files').updateOne({ _id: fileId, userId }, { $set: { isPublic: false } });

    const file = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: fileId, userId });
    return res.status(200).json({
      id: file._id.toString(),
      userId: file.userId.toString(),
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId.toString(),
      localPath: file.localPath,
    });
  },
};

export default FilesController;
