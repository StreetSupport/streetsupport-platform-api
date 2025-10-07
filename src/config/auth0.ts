import dotenv from 'dotenv';

dotenv.config();

const auth0Config = {
  domain: process.env.AUTH0_DOMAIN,
  audience: process.env.AUTH0_AUDIENCE,
  managementClientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
  managementClientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
  managementAudience: process.env.AUTH0_MANAGEMENT_AUDIENCE,
  userDbConnection: process.env.AUTH0_USER_DB_CONNECTION,
};

if (!auth0Config.domain) {
  throw new Error('AUTH0_DOMAIN is not set in .env file');
}

if (!auth0Config.audience) {
  throw new Error('AUTH0_AUDIENCE is not set in .env file');
}

if (!auth0Config.managementClientId) {
  throw new Error('AUTH0_MANAGEMENT_CLIENT_ID is not set in .env file');
}

if (!auth0Config.managementClientSecret) {
  throw new Error('AUTH0_MANAGEMENT_CLIENT_SECRET is not set in .env file');
}

if (!auth0Config.managementAudience) {
  throw new Error('AUTH0_MANAGEMENT_AUDIENCE is not set in .env file');
}

if (!auth0Config.userDbConnection) {
  throw new Error('AUTH0_USER_DB_CONNECTION is not set in .env file');
}

export default auth0Config;
