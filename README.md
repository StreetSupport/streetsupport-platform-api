# Street Support Platform API

This is the **Backend API** for the Street Support Network platform, providing data services for the Admin CMS and Public Website.

---

## 🚀 Tech Stack

- **Express.js** with TypeScript
- **MongoDB** with Mongoose ODM
- **Auth0** for JWT authentication
- **Azure Blob Storage** for file uploads
- **SendGrid** for transactional emails
- **Zod** for runtime validation
- **node-cron** for background jobs
- **Jest** for testing

---

## 🧪 Testing

Unit tests use **Jest**.

Run all tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

**Testing Highlights:**
- Tests located in `tests/` directory
- Smoke test currently configured
- Full test suite to be implemented

✅ **All tests must pass before merging into `staging` or `main`.**

---

## 🧹 Linting

ESLint is configured for code quality:

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

---

## 📂 Local Development

Run the project locally:

```bash
npm install
npm run dev
```

### Required Environment Variables

Create a `.env` file with:

```bash
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://...

# Auth0
AUTH0_DOMAIN='take it from https://manage.auth0.com/. For example: your-tenant.auth0.com'
AUTH0_AUDIENCE='take it from https://manage.auth0.com/'
AUTH0_USER_DB_CONNECTION='take it from https://manage.auth0.com/'
AUTH0_MANAGEMENT_CLIENT_ID='take it from https://manage.auth0.com/'
AUTH0_MANAGEMENT_CLIENT_SECRET='take it from https://manage.auth0.com/'
AUTH0_MANAGEMENT_AUDIENCE='take it from https://manage.auth0.com/. For example: https://your-tenant.auth0.com/api/v2/'

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_BANNERS_CONTAINER_NAME=banners
AZURE_SWEPS_CONTAINER_NAME=sweps
AZURE_RESOURCES_CONTAINER_NAME=resources
AZURE_LOCATION_LOGOS_CONTAINER_NAME=location-logos

# SendGrid
SENDGRID_API_KEY=SG...
FROM_EMAIL=
SENDGRID_ORG_UPDATE_NOTIFICATION_REMINDER_TEMPLATE_ID=d-...
SENDGRID_ORG_VERIFICATION_EXPIRED_NOTIFICATION_TEMPLATE_ID=d-...
ADMIN_URL=https://admin.streetsupport.net

# Sentry (optional)
SENTRY_DSN=https://...@sentry.io/...
```

---

## 🧭 Project Structure

```
src/
├── app.ts                # Express app configuration
├── index.ts              # Server entry point
├── config/               # Configuration (Auth0, etc.)
├── constants/            # Role definitions, HTTP methods
├── controllers/          # Request handlers
├── jobs/                 # Cron background jobs
├── middleware/           # Auth, upload middleware
├── models/               # Mongoose models
├── routes/               # Express routes
├── schemas/              # Zod validation schemas
├── services/             # Business logic (email, Auth0)
├── types/                # TypeScript interfaces
└── utils/                # Helper utilities
tests/
└── smoke.test.js         # Smoke tests
```

---

## 🔐 Authentication

The API uses **Auth0 JWT tokens** for authentication:

1. Admin panel authenticates users via Auth0
2. API receives Bearer token in Authorization header
3. Middleware validates token and loads user from MongoDB
4. RBAC middleware checks user roles for endpoint access

### Roles

| Role | Description |
|------|-------------|
| `SuperAdmin` | Full platform access |
| `CityAdmin` | Location-specific access |
| `VolunteerAdmin` | Organisation management |
| `OrgAdmin` | Single organisation access |
| `SwepAdmin` | SWEP banner management |

---

## 📡 API Endpoints

### Core Resources

| Resource | Endpoints | Auth |
|----------|-----------|------|
| **Users** | `/api/users` | Admin roles |
| **Organisations** | `/api/organisations` | Role-based |
| **Services** | `/api/services` | Role-based |
| **Accommodations** | `/api/accommodations` | Role-based |
| **Banners** | `/api/banners` | Role-based |
| **SWEP Banners** | `/api/swep-banners` | SWEP/City Admin |
| **FAQs** | `/api/faqs` | Role-based |
| **Cities** | `/api/cities` | Authenticated |
| **Location Logos** | `/api/location-logos` | City Admin |
| **Resources** | `/api/resources` | Volunteer Admin |
| **Service Categories** | `/api/service-categories` | Public read |

---

## ⏰ Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Verification Check | Daily 9 AM | Send reminders, unverify stale organisations |
| Banner Activation | Daily 00:05 AM | Activate/deactivate scheduled banners |
| SWEP Activation | Daily 00:00 AM | Track SWEP banner activation times |
| Organisation Disabling | Daily 00:10 AM  | Handle extended inactivity |

---

## 🔄 Deployment

### Environments

| Environment | Branch | Azure Service |
|-------------|--------|---------------|
| Staging | `staging` | `streetsupport-api-staging` |
| Production | `main` | `streetsupport-api` |

### CI/CD

1. Create feature branch from `staging`
2. PR triggers tests and linting
3. Merge to `staging` → Deploy to staging
4. Merge to `main` → Deploy to production

---

## 📚 Documentation

Comprehensive documentation is available in the Admin project:
- **[Admin Project Docs](../streetsupport-platform-admin/docs/)**
- [Permissions System](../streetsupport-platform-admin/docs/PERMISSIONS.md)
- [Collection Schemas](../streetsupport-platform-admin/docs/COLLECTION_SCHEMAS.md)
- [Validation (Zod)](../streetsupport-platform-admin/docs/VALIDATION.md)
- [File Uploading](../streetsupport-platform-admin/docs/FILE_UPLOADING.md)
- [Cron Jobs & SendGrid](../streetsupport-platform-admin/docs/CRON_JOBS_AND_SENDGRID.md)

---

## 🔗 Related Projects

- **Admin CMS**: [streetsupport-platform-admin](../streetsupport-platform-admin)
- **Public Website**: [streetsupport-platform-web](../streetsupport-platform-web)

---

## 📝 Contribution Guidelines

1. Create feature branch from `staging`
2. Follow existing code patterns
3. Add appropriate tests
4. Ensure linting passes
5. Create PR with description
6. Wait for review and CI checks

---

## License

This project is licensed under the [MIT License](LICENSE).
