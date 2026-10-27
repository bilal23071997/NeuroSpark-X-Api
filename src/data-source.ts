import { DataSource } from 'typeorm';

// Used only by the TypeORM CLI (npm run migration:generate / migration:run),
// which runs the compiled copy in dist/. The app itself is configured in
// app.module.ts. DATABASE_URL and DB_SSL come from the environment (.env).
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [`${import.meta.dirname}/**/*.entity.js`],
  migrations: [`${import.meta.dirname}/migrations/*.js`],
});
