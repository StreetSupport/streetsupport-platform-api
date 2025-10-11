import { auth } from 'express-oauth2-jwt-bearer';
import auth0Config from '../config/auth0.js';

const checkJwt = auth({
  audience: auth0Config.audience!,
  issuerBaseURL: `https://${auth0Config.domain}/`,
  tokenSigningAlg: 'RS256'
});

export default checkJwt;
