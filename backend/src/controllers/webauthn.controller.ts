import { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const rpName = 'TeachersBank';

const getWebAuthnConfig = (req: Request) => {
  // Try env vars first, otherwise derive from the request (perfect for Vercel/dynamic hosting)
  let rpID = process.env.RP_ID || req.hostname;
  
  // Clean up rpID if it contains ports (e.g., localhost:3000 -> localhost)
  if (rpID.includes(':')) {
    rpID = rpID.split(':')[0];
  }

  // origin must exactly match what the browser sees
  const origin = process.env.CLIENT_URL || req.headers.origin || (req.hostname === 'localhost' ? 'http://localhost:5173' : `https://${req.headers.host}`);
  
  return { rpID, origin };
};

export const generateRegOptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { rpID } = getWebAuthnConfig(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id, 'utf8')),
      userName: user.email || 'unknown',
      attestationType: 'none',
      excludeCredentials: user.authenticators
        .filter(auth => auth.credentialID)
        .map((auth) => ({
          id: Buffer.from(auth.credentialID).toString('base64url'),
          type: 'public-key',
          transports: auth.transports ? (auth.transports.split(',') as any[]) : [],
        })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

    res.json(options);
  } catch (error: any) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyRegResponse = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const body = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.currentChallenge) {
      return res.status(400).json({ error: 'User or challenge not found' });
    }

    const { rpID, origin } = getWebAuthnConfig(req);

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { id, publicKey, counter } = verification.registrationInfo.credential;
      const { credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      await prisma.authenticator.create({
        data: {
          credentialID: Buffer.from(id, 'base64url'),
          credentialPublicKey: Buffer.from(publicKey),
          counter: BigInt(counter),
          credentialDeviceType,
          credentialBackedUp,
          transports: body.response.transports ? body.response.transports.join(',') : '',
          userId: user.id,
        },
      });

      // Clear the challenge
      await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: null },
      });

      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('Verify registration error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const generateAuthOptions = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { authenticators: true },
    });

    if (!user || user.authenticators.length === 0) {
      return res.status(404).json({ error: 'User not found or no biometric registered' });
    }

    const { rpID } = getWebAuthnConfig(req);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.authenticators
        .filter(auth => auth.credentialID)
        .map((auth) => ({
          id: Buffer.from(auth.credentialID).toString('base64url'),
          type: 'public-key',
          transports: auth.transports ? (auth.transports.split(',') as any[]) : [],
        })),
      userVerification: 'preferred',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge },
    });

    res.json(options);
  } catch (error: any) {
    console.error('Auth options error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyAuthResponse = async (req: Request, res: Response) => {
  try {
    const { email, response } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { authenticators: true, member: true },
    });

    if (!user || !user.currentChallenge) {
      return res.status(400).json({ error: 'User or challenge not found' });
    }

    const authenticator = user.authenticators.find(
      (auth) => Buffer.from(auth.credentialID).toString('base64url') === response.id
    );

    if (!authenticator) {
      return res.status(400).json({ error: 'Authenticator not registered with this user' });
    }

    const { rpID, origin } = getWebAuthnConfig(req);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: Buffer.from(authenticator.credentialID).toString('base64url'),
        publicKey: new Uint8Array(authenticator.credentialPublicKey),
        counter: Number(authenticator.counter),
        transports: authenticator.transports ? (authenticator.transports.split(',') as any[]) : [],
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      // Update counter
      await prisma.authenticator.update({
        where: { id: authenticator.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });

      // Clear the challenge
      await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: null },
      });

      // Issue JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      res.json({
        verified: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          memberId: user.member?.id,
        },
      });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('Verify auth error:', error);
    res.status(500).json({ error: error.message });
  }
};
