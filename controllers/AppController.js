import dbClient from "../utils/db";
import redisClient from "../utils/redis";

const AppController = {
    async getStatus(req, res) {
        const redisISAlive = redisClient.isAlive();
        const dbisAlive = dbClient.isAlive();

        res.status(200).json({redis: redisISAlive, db: dbisAlive});
    },

    async getStats(req, res) {
        try {
            const userCount = await dbClient.nbUsers();
            const fileCount = await dbClient.nbFiles();

            res.status(200).json({users: userCount, files: fileCount});
        } catch(err) {
            console.log(err);

            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export default AppController;
