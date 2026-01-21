import crypto from 'crypto';
import auth0Config from '../config/auth0.js';
import { HTTP_METHODS } from '../constants/httpMethods.js';

interface Auth0UserMetadata {
  authorization: {
    roles: string[];
  };
}

interface CreateAuth0UserRequest {
  connection: string;
  email: string;
  name: string;
  password: string;
  email_verified: boolean;
  verify_email: boolean;
  app_metadata: Auth0UserMetadata;
  user_metadata: Record<string, unknown>;
}

interface Auth0UserResponse {
  user_id: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Generate a temporary password following Auth0 password policy requirements
 * Rules set in Auth0 -> Connections -> Database -> Password Policy
 */
function generateTempPassword(): string {
  const maxSize = 30;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*';
  const randomBytes = crypto.randomBytes(maxSize);
  
  let result = '';
  for (let i = 0; i < maxSize; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Get Auth0 Management API access token
 */
async function getAuth0ManagementToken(): Promise<string> {
  const domain = auth0Config.domain as string;
  const clientId = auth0Config.managementClientId as string;
  const clientSecret = auth0Config.managementClientSecret as string;
  const audience = (auth0Config.managementAudience as string) || `https://${domain}/api/v2/`;

  if (!domain || !clientId || !clientSecret) {
    throw new Error('Auth0 Management API credentials are not configured');
  }

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: HTTP_METHODS.POST,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: audience,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Auth0 management token: ${error}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Create a user in Auth0
 * @param email - User email
 * @param authClaims - Array of authorization claims/roles
 * @returns Created Auth0 user with auto-generated user_id
 */
export async function createAuth0User(
  email: string,
  authClaims: string[]
): Promise<Auth0UserResponse> {
  const domain = auth0Config.domain as string;
  const connection = (auth0Config.userDbConnection as string) || 'Username-Password-Authentication';

  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  // Get management API token
  const accessToken = await getAuth0ManagementToken();

  // Build create user request - Auth0 will auto-generate user_id
  // We set email_verified: true because admins control user creation
  // We set verify_email: false to prevent Auth0 sending verification email
  // Instead, we send a password change email so users can set their password
  const createUserRequest: CreateAuth0UserRequest = {
    connection: connection,
    email: email,
    name: email, // Use email as name
    password: generateTempPassword(),
    email_verified: true,
    verify_email: false,
    app_metadata: {
      authorization: {
        roles: authClaims,
      },
    },
    user_metadata: {},
  };

  // Create user in Auth0
  const response = await fetch(`https://${domain}/api/v2/users`, {
    method: HTTP_METHODS.POST,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(createUserRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Auth0 user: ${JSON.stringify(error)}`);
  }

  const createdUser = await response.json() as Auth0UserResponse;
  return createdUser;
}

/**
 * Send password change email to user via Auth0 Authentication API
 * This allows new users to set their password after account creation
 * @param email - User email address
 */
export async function sendPasswordChangeEmail(email: string): Promise<void> {
  const domain = auth0Config.domain as string;
  const clientId = auth0Config.clientId as string;
  const connection = (auth0Config.userDbConnection as string) || 'Username-Password-Authentication';

  if (!domain || !clientId) {
    throw new Error('AUTH0_DOMAIN or AUTH0_CLIENT_ID is not configured');
  }

  const response = await fetch(`https://${domain}/dbconnections/change_password`, {
    method: HTTP_METHODS.POST,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      email: email,
      connection: connection,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send password change email: ${error}`);
  }
}

/**
 * Delete a user from Auth0
 * @param auth0UserId - Auth0 user ID (e.g., "auth0|123456")
 */
export async function deleteAuth0User(auth0UserId: string): Promise<void> {
  const domain = auth0Config.domain as string;

  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  const accessToken = await getAuth0ManagementToken();

  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent('auth0|' + auth0UserId)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Auth0 user: ${error}`);
  }
};

/**
 * Update user roles in Auth0
 * @param auth0UserId - Auth0 user ID
 * @param authClaims - Updated array of authorization claims/roles
 */
export async function updateAuth0UserRoles(
  auth0UserId: string,
  authClaims: string[]
): Promise<void> {
  const domain = auth0Config.domain as string;

  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  const accessToken = await getAuth0ManagementToken();

  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent('auth0|' + auth0UserId)}`, {
    method: HTTP_METHODS.PATCH,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      app_metadata: {
        authorization: {
          roles: authClaims,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update Auth0 user roles: ${JSON.stringify(error)}`);
  }
}

/**
 * Block a user in Auth0
 * @param auth0UserId - Auth0 user ID
 */
export async function blockAuth0User(auth0UserId: string): Promise<void> {
  const domain = auth0Config.domain as string;

  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  const accessToken = await getAuth0ManagementToken();

  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent('auth0|' + auth0UserId)}`, {
    method: HTTP_METHODS.PATCH,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      blocked: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to block Auth0 user: ${JSON.stringify(error)}`);
  }
}

/**
 * Unblock a user in Auth0
 * @param auth0UserId - Auth0 user ID
 */
export async function unblockAuth0User(auth0UserId: string): Promise<void> {
  const domain = auth0Config.domain as string;

  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  const accessToken = await getAuth0ManagementToken();

  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent('auth0|' + auth0UserId)}`, {
    method: HTTP_METHODS.PATCH,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      blocked: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to unblock Auth0 user: ${JSON.stringify(error)}`);
  }
}
