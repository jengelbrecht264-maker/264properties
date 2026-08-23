"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "postinstall": "prisma generate",
  "typecheck": "tsc --noEmit",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:setup": "npm run db:generate && npm run db:migrate && npm run db:seed"
},
