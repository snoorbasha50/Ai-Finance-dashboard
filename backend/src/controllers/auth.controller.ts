import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/user.model';
import { config } from '../config';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign({ userId, email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ userId, email }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    return reply.code(400).send({ error: result.error.errors[0].message });
  }

  const { email, password, name } = result.data;

  const existing = await User.findOne({ email });
  if (existing) {
    return reply.code(409).send({ error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({ email, password: hashedPassword, name });

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);

  return reply.code(201).send({
    user: { id: user._id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    return reply.code(400).send({ error: result.error.errors[0].message });
  }

  const { email, password } = result.data;

  const user = await User.findOne({ email });
  if (!user) {
    return reply.code(401).send({ error: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return reply.code(401).send({ error: 'Invalid email or password' });
  }

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.email);

  return reply.send({
    user: { id: user._id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
}

export async function refreshToken(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken: token } = request.body as { refreshToken: string };

  if (!token) {
    return reply.code(400).send({ error: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as {
      userId: string;
      email: string;
    };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId,
      decoded.email
    );
    return reply.send({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired refresh token' });
  }
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const user = await User.findById(request.user?.userId).select('-password');
  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }
  return reply.send({ user });
}
