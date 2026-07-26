import { Router } from 'express';
import { oauthRouter } from './oauth';
import { otpRouter } from './otp';
import { passwordRouter } from './password';
import { registerRouter } from './register';
import { sessionRouter } from './session';
import { twoFaRouter } from './twofa';

/**
 * Auth API surface (mounted at /api/auth):
 * POST /register
 * POST /login | /refresh | /logout | GET /me
 * GET  /oauth/:provider | GET|POST /oauth/:provider/callback | POST /oauth/exchange | POST /oauth
 * POST /otp/request | /otp/verify
 * POST /password/forgot | /password/reset
 * POST /2fa/setup | /2fa/verify | /2fa/disable
 */
export const authRouter = Router();

authRouter.use('/register', registerRouter);
authRouter.use(sessionRouter);
authRouter.use('/oauth', oauthRouter);
authRouter.use('/otp', otpRouter);
authRouter.use('/password', passwordRouter);
authRouter.use('/2fa', twoFaRouter);
