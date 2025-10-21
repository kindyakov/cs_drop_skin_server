## 📂 Структура проекта

```
📁 logs
│   ├── 📄 combined.log
│   ├── 📄 error.log
│   ├── 📄 exceptions.log
│   └── 📄 rejections.log

📁 prisma
│   ├── 📁 migrations
│   │   ├── 📁 20251015170232_init
│   │   │   └── 📄 migration.sql
│   │   └── 📄 migration_lock.toml
│   └── 📄 schema.prisma

📁 src
│   ├── 📄 app.ts
│   ├── 📄 server.ts
│   ├── 📁 config
│   │   ├── 📄 CONFIG_REFERENCE.md
│   │   ├── 📄 database.ts
│   │   ├── 📄 env.config.ts
│   │   └── 📄 passport.config.ts
│   ├── 📁 controllers
│   │   ├── 📄 auth.controller.ts
│   │   ├── 📄 case.controller.ts
│   │   ├── 📄 caseOpening.controller.ts
│   │   ├── 📄 CONTROLLERS_REFERENCE.md
│   │   └── 📄 user.controller.ts
│   ├── 📁 jobs
│   │   ├── 📄 JOBS_REFERENCE.md
│   │   └── 📄 syncItems.job.ts
│   ├── 📁 middleware
│   │   ├── 📄 auth.middleware.ts
│   │   ├── 📄 errorHandler.middleware.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 logger.middleware.ts
│   │   ├── 📄 MIDDLEWARE_REFERENCE.md
│   │   ├── 📄 rateLimiter.middleware.ts
│   │   └── 📄 security.middleware.ts
│   ├── 📁 routes
│   │   ├── 📄 auth.routes.ts
│   │   ├── 📄 case.routes.ts
│   │   ├── 📄 caseOpening.routes.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 ROUTES_REFERENCE.md
│   │   └── 📄 user.routes.ts
│   ├── 📁 services
│   │   ├── 📄 case.service.ts
│   │   ├── 📄 caseOpening.service.ts
│   │   ├── 📄 marketCs.service.ts
│   │   ├── 📄 payment.service.ts
│   │   ├── 📄 SERVICES_REFERENCE.md
│   │   └── 📄 user.service.ts
│   ├── 📁 types
│   │   ├── 📄 case.types.ts
│   │   ├── 📄 caseOpening.types.ts
│   │   ├── 📄 constants.ts
│   │   ├── 📄 express.d.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 item.types.ts
│   │   ├── 📄 payment.types.ts
│   │   ├── 📄 TYPES_REFERENCE.md
│   │   └── 📄 user.types.ts
│   └── 📁 utils
│       ├── 📄 errors.util.ts
│       ├── 📄 helpers.util.ts
│       ├── 📄 index.ts
│       ├── 📄 jwt.util.ts
│       ├── 📄 response.util.ts
│       └── 📄 UTILS_REFERENCE.md

📁 uploads

---

📄 .env
📄 .env.example
📄 .gitignore
📄 .prettierrc
📄 eslint.config.js
📄 nodemon.json
📄 package.json
📄 PROJECT_CONTEXT.md
📄 README.md
📄 tsconfig.json
```
