import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import backgroundsRouter from './routes/backgrounds';
import storyRouter from './routes/story';
import optionsRouter from './routes/options';
import promptRouter from './routes/prompt';

const app = express();

const allowOrigins = process.env.CORS_ALLOW_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: allowOrigins && allowOrigins.length > 0 ? allowOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/backgrounds', backgroundsRouter);
app.use('/api/story', storyRouter);
app.use('/api/options', optionsRouter);
app.use('/api/prompt', promptRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});
