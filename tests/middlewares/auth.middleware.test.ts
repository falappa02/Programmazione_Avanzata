import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../src/middlewares/auth.middleware';
import { getRsaKeys } from '../../src/config/keys';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User';

jest.mock('../../src/models/User');

describe('Middleware Test: authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  test('Dovrebbe sollevare UnauthorizedError se l\'header Authorization è assente', async () => {
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: expect.stringContaining('Token JWT non fornito'),
      })
    );
  });

  test('Dovrebbe autenticare correttamente la richiesta fornendo un token JWT RS256 valido', async () => {
    const { privateKey } = getRsaKeys();
    const token = jwt.sign(
      { id: 'user-uuid-123', email: 'test@univpm.it', role: 'user' },
      privateKey,
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    (User.findByPk as jest.Mock).mockResolvedValue({
      id: 'user-uuid-123',
      email: 'test@univpm.it',
      role: 'user',
      tokens: 100.0,
    });

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.email).toBe('test@univpm.it');
    expect(nextFunction).toHaveBeenCalledWith();
  });

  test('Dovrebbe restituire 401 Unauthorized se i token dell\'utente sono terminati (<= 0)', async () => {
    const { privateKey } = getRsaKeys();
    const token = jwt.sign(
      { id: 'user-uuid-exhausted', email: 'exhausted@univpm.it', role: 'user' },
      privateKey,
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    (User.findByPk as jest.Mock).mockResolvedValue({
      id: 'user-uuid-exhausted',
      email: 'exhausted@univpm.it',
      role: 'user',
      tokens: 0.0, // Exhausted tokens
    });

    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: expect.stringContaining('Credito token terminato'),
      })
    );
  });
});
