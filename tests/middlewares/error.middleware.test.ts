import { Request, Response, NextFunction } from 'express';
import { errorHandlerMiddleware } from '../../src/middlewares/error.middleware';
import { AppError } from '../../src/errors/AppError';
import { InsufficientCreditError } from '../../src/errors/InsufficientCreditError';

describe('Middleware Test: errorHandlerMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  test('Dovrebbe formattare correttamente una eccezione di tipo InsufficientCreditError con status code 400', () => {
    const error = new InsufficientCreditError('Credito insufficiente per operazione');

    errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Credito insufficiente per operazione',
          statusCode: 400,
        }),
      })
    );
  });

  test('Dovrebbe gestire errori generici del server ritornando status code 500', () => {
    const error = new Error('Errore generico di sistema non gestito');

    errorHandlerMiddleware(error, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Errore interno del server.',
          statusCode: 500,
        }),
      })
    );
  });
});
