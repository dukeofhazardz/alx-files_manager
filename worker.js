const Queue = require('bull');
const fileQueue = new Queue('fileQueue');
const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const dbClient = require('./utils/db');
const path = require('path');
import FOLDER_PATH from './controllers/FilesController';

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }
  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const file = await dbClient.client.db(dbClient.database).collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  if (file.type === 'image') {
    // Generate thumbnails and save them with the original file
    const sizes = [500, 250, 100];
    const promises = sizes.map(async (size) => {
      const thumbnailPath = path.join(FOLDER_PATH, `${fileId}_${size}`);
      await imageThumbnail(file.localPath, { width: size, height: size, responseType: 'base64' })
        .then((thumbnail) => fs.writeFileSync(thumbnailPath, thumbnail));
    });

    await Promise.all(promises);
  }
});
