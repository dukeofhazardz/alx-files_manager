const express = require('express');
import routes from './routes';

const app = express();
const port = process.env.HOST || 5000;

app.use('/', routes);

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
