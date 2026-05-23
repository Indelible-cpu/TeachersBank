import { Request, Response } from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const rpName = 'Teachers Bank';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.CLIENT_URL || 'http://localhost:5173';

export const generateRegistrationOptionsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: user.authenticators.map(auth => ({
        id: Buffer.from(auth.credentialID, 'base64url'),
        type: 'public-key',
        transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
      })),
      authenticatorSelection: {
        userVerification: 'preferred',
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge }
    });

    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyRegistrationResponseHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.currentChallenge) {
      return res.status(400).json({ error: 'No challenge found for user' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      await prisma.authenticator.create({
        data: {
          credentialID: Buffer.from(credentialID).toString('base64url'),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter: BigInt(counter),
          credentialDeviceType,
          credentialBackedUp,
          userId: user.id,
          transports: req.body.response.transports ? req.body.response.transports.join(',') : '',
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: null }
      });

      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const generateAuthenticationOptionsHandler = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { authenticators: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.authenticators.map(auth => ({
        id: Buffer.from(auth.credentialID, 'base64url'),
        type: 'public-key',
        transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
      })),
      userVerification: 'preferred',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { currentChallenge: options.challenge }
    });

    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyAuthenticationResponseHandler = async (req: Request, res: Response) => {
  try {
    const { email, response } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { authenticators: true, member: true }
    });

    if (!user || !user.currentChallenge) {
      return res.status(400).json({ error: 'User or challenge not found' });
    }

    const authenticator = user.authenticators.find(
      auth => auth.credentialID === response.id
    );

    if (!authenticator) {
      return res.status(400).json({ error: 'Authenticator not found for user' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
        credentialPublicKey: authenticator.credentialPublicKey,
        counter: Number(authenticator.counter),
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      await prisma.authenticator.update({
        where: { credentialID: authenticator.credentialID },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: null }
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          memberId: user.member?.id
        }
      });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
