import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ErrorFactory } from '../errors';

/**
 * Middleware di Validazione degli Input tramite schemi Zod.
 * 
 * Concetto d'esame (Type Erasure & Validazione Runtime):
 * In TypeScript, tutti i tipi e le interfacce vengono eliminati in fase di compilazione (type erasure).
 * I dati provenienti dall'esterno (body JSON, query string, parametri URL) non sono garantiti a runtime.
 * Usare Zod permette di convalidare la struttura dei dati a runtime prima che raggiungano i Controller,
 * proteggendo l'applicazione da input malformati o attacchi di injection.
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.').replace(/^(body|query|params)\./, ''),
          message: e.message,
        }));
        next(ErrorFactory.badRequest('Dati di richiesta non validi.', formattedErrors));
      } else {
        next(error);
      }
    }
  };
}
