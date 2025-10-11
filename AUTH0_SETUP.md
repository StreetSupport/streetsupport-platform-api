# Auth0 User Creation Setup

## Overview
The API now integrates with Auth0 Management API to create users programmatically when admins add new users through the admin panel.

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# Existing Auth0 Configuration (for JWT verification)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier

# Auth0 Management API Configuration (for user creation)
AUTH0_MANAGEMENT_CLIENT_ID=your_management_api_client_id
AUTH0_MANAGEMENT_CLIENT_SECRET=your_management_api_client_secret
AUTH0_MANAGEMENT_AUDIENCE=https://your-tenant.auth0.com/api/v2/
AUTH0_USER_DB_CONNECTION=Username-Password-Authentication
```

## Setting Up Auth0 Management API

### 1. Create a Machine-to-Machine Application

1. Go to your Auth0 Dashboard
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Name it "Street Support Management API" (or similar)
5. Select **Machine to Machine Applications**
6. Click **Create**

### 2. Authorize the Application

1. Select **Auth0 Management API** as the API
2. Grant the following permissions (scopes):
   - `create:users` - Create users
   - `update:users` - Update user metadata
   - `delete:users` - Delete users (for cleanup on errors)
   - `read:users` - Read user information
3. Click **Authorize**

### 3. Get Credentials

1. Go to the **Settings** tab of your Machine-to-Machine application
2. Copy the **Client ID** → Use as `AUTH0_MANAGEMENT_CLIENT_ID`
3. Copy the **Client Secret** → Use as `AUTH0_MANAGEMENT_CLIENT_SECRET`

### 4. Configure Database Connection

1. Go to **Authentication** → **Database**
2. Note the name of your database connection (usually "Username-Password-Authentication")
3. Use this as `AUTH0_USER_DB_CONNECTION`

### 5. Set Management API Audience

The audience is typically: `https://YOUR_DOMAIN/api/v2/`

For example: `https://your-tenant.auth0.com/api/v2/`

## How It Works

### User Creation Flow

1. **Admin creates user** in the admin panel
2. **API validates** user data with Zod schema
3. **Auth0 user created** first via Management API with:
   - `email`: User's email
   - `name`: User's email (used as display name)
   - `password`: Auto-generated secure password
   - `app_metadata.authorization.roles`: User's AuthClaims array
   - `email_verified`: false (requires email verification)
   - `verify_email`: true (sends verification email)
   - Auth0 auto-generates unique `user_id` (e.g., `auth0|507f1f77bcf86cd799439011`)
4. **MongoDB user created** with Auth0's generated `user_id` stored in `Auth0Id` field

### Error Handling

- If **Auth0 creation fails**: Error returned immediately, no MongoDB user created
- If **MongoDB creation fails**: Auth0 user is deleted (rollback for consistency)
- Detailed error messages returned to admin panel

### Password Management

- **Auto-generated** secure 30-character password
- Contains uppercase, lowercase, numbers, and special characters
- Meets Auth0 password policy requirements
- Users will use **password reset** flow for first login

## API Functions

### `createAuth0User(email, authClaims)`
Creates a new user in Auth0 with auto-generated user ID

**Parameters:**
- `email`: User's email address
- `authClaims`: Array of role strings (e.g., `['SuperAdmin']`, `['CityAdmin', 'CityAdminFor:manchester']`)

**Returns:** Auth0 user object with auto-generated `user_id` (e.g., `auth0|507f1f77bcf86cd799439011`)

### `deleteAuth0User(auth0UserId)`
Deletes a user from Auth0

**Parameters:**
- `auth0UserId`: Auth0 user ID (e.g., `"auth0|123456"`)

### `updateAuth0UserRoles(auth0UserId, authClaims)`
Updates user roles in Auth0 app_metadata

**Parameters:**
- `auth0UserId`: Auth0 user ID
- `authClaims`: Updated array of role strings

## Testing

### Test User Creation

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "Email": "test@example.com",
    "UserName": "testuser",
    "AuthClaims": ["CityAdmin", "CityAdminFor:manchester"]
  }'
```

### Verify in Auth0 Dashboard

1. Go to **User Management** → **Users**
2. Find the newly created user
3. Check **app_metadata** contains authorization roles
4. Copy the **user_id** and verify it matches the `Auth0Id` field in MongoDB

## Troubleshooting

### "Failed to get Auth0 management token"
- Verify `AUTH0_MANAGEMENT_CLIENT_ID` and `AUTH0_MANAGEMENT_CLIENT_SECRET` are correct
- Check that Machine-to-Machine application is authorized for Management API

### "Failed to create Auth0 user"
- Verify `AUTH0_DOMAIN` is correct (without `https://`)
- Check `AUTH0_USER_DB_CONNECTION` matches your database connection name
- Ensure Management API has `create:users` permission
- Check Auth0 Dashboard → Logs for detailed error messages

### "User created in Auth0 but not in MongoDB"
- Check server logs for MongoDB error details
- Auth0 user should be automatically deleted on MongoDB failure
- If Auth0 user remains without MongoDB record, it will be cleaned up on retry

## Security Considerations

- **Management API credentials** are highly sensitive - store securely
- **Never expose** `AUTH0_MANAGEMENT_CLIENT_SECRET` in client-side code
- **Auto-generated passwords** are not accessible after creation
- Users must use **password reset flow** for first login
- **Role-based access control** enforced via RBAC middleware

## Next Steps

1. Set up password reset email templates in Auth0
2. Configure Auth0 Actions/Rules if needed
3. Set up user invitation email flow (optional)
4. Configure multi-factor authentication (recommended)
