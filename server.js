import routes from './routes';

const express = require('express');

const app = express();
const port = process.env.HOST || 5000;

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
