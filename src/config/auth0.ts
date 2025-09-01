import dotenv from 'dotenv';

dotenv.config();

const auth0Config = {
  domain: process.env.AUTH0_DOMAIN,
  audience: process.env.AUTH0_AUDIENCE,
};

if (!auth0Config.domain) {
  throw new Error('AUTH0_DOMAIN is not set in .env file');
}

if (!auth0Config.audience) {
  throw new Error('AUTH0_AUDIENCE is not set in .env file');
}

export default auth0Config;
