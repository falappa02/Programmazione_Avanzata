import {
  ErrorFactory,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InsufficientCreditError,
  AppError,
} from '../../src/errors';

describe('Design Pattern: Factory Method (ErrorFactory)', () => {
  it('dovrebbe istanziare un BadRequestError tramite la factory', () => {
    const error = ErrorFactory.badRequest('Parametro errato', { field: 'name' });
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Parametro errato');
    expect(error.details).toEqual({ field: 'name' });
  });

  it('dovrebbe istanziare un NotFoundError con o senza identificativo', () => {
    const errorWithId = ErrorFactory.notFound('Dataset', '123-abc');
    expect(errorWithId).toBeInstanceOf(NotFoundError);
    expect(errorWithId.statusCode).toBe(404);
    expect(errorWithId.message).toContain("ID '123-abc'");

    const errorGeneric = ErrorFactory.notFound('Dataset');
    expect(errorGeneric.message).toBe('Dataset non trovato/a.');
  });

  it('dovrebbe istanziare un UnauthorizedError con messaggio personalizzato', () => {
    const error = ErrorFactory.unauthorized('Token scaduto.');
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token scaduto.');
  });

  it('dovrebbe istanziare un ForbiddenError', () => {
    const error = ErrorFactory.forbidden('Solo admin.');
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Solo admin.');
  });

  it('dovrebbe istanziare un InsufficientCreditError formattando i crediti', () => {
    const error = ErrorFactory.insufficientCredit(10, 3.5);
    expect(error).toBeInstanceOf(InsufficientCreditError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('Richiesti: 10, disponibili: 3.5');
  });

  it('dovrebbe istanziare un AppError interno generico (500)', () => {
    const error = ErrorFactory.internal('Errore database');
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Errore database');
  });
});
