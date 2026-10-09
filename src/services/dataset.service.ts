import { Dataset, Content } from '../models';
import { ErrorFactory } from '../errors';
import { Op } from 'sequelize';

export class DatasetService {
  /**
   * Crea un nuovo dataset vuoto per l'utente autenticato.
   * Utilizza la struttura dati Set<string> per eliminare eventuali tag duplicati.
   */
  public async createDataset(userId: string, name: string, tags: string[] = []) {
    // Verifica che non esista già un dataset attivo con lo stesso nome per l'utente
    const existing = await Dataset.findOne({
      where: {
        userId,
        name,
        isDeleted: false,
      },
    });

    if (existing) {
      throw ErrorFactory.badRequest(`Un dataset denominato '${name}' esiste già per questo utente.`);
    }

    // Utilizzo di Set<string> per garantire l'unicità dei tag (domanda orale su Set)
    const uniqueTags = Array.from(new Set<string>(tags));

    const dataset = await Dataset.create({
      userId,
      name,
      tags: uniqueTags,
      isDeleted: false,
    });

    return dataset;
  }

  /**
   * Recupera tutti i dataset attivi (non eliminati) dell'utente con i rispettivi contenuti.
   */
  public async getUserDatasets(userId: string) {
    const datasets = await Dataset.findAll({
      where: {
        userId,
        isDeleted: false,
      },
      include: [
        {
          model: Content,
          as: 'contents',
          attributes: ['id', 'type', 'originalName', 'fileSizeKb', 'frameCount', 'tokenCost', 'createdAt'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return datasets;
  }

  /**
   * Aggiorna i metadati del dataset (nome e/o tag), validando l'univocità del nome.
   */
  public async updateDataset(userId: string, datasetId: string, name?: string, tags?: string[]) {
    const dataset = await Dataset.findOne({
      where: { id: datasetId, userId, isDeleted: false },
    });

    if (!dataset) {
      throw ErrorFactory.notFound('Dataset', datasetId);
    }

    if (name && name !== dataset.name) {
      const existing = await Dataset.findOne({
        where: {
          userId,
          name,
          isDeleted: false,
          id: { [Op.ne]: datasetId },
        },
      });

      if (existing) {
        throw ErrorFactory.badRequest(`Un altro dataset attivo dell'utente ha già il nome '${name}'.`);
      }

      dataset.name = name;
    }

    if (tags !== undefined) {
      // Garantisce unicità dei tag tramite Set<string>
      dataset.tags = Array.from(new Set<string>(tags));
    }

    await dataset.save();
    return dataset;
  }

  /**
   * Cancellazione logica (Soft Delete) del dataset per preservare la tracciabilità dei dati.
   */
  public async deleteDataset(userId: string, datasetId: string) {
    const dataset = await Dataset.findOne({
      where: { id: datasetId, userId, isDeleted: false },
    });

    if (!dataset) {
      throw ErrorFactory.notFound('Dataset', datasetId);
    }

    dataset.isDeleted = true;
    await dataset.save();

    return { message: 'Dataset eliminato con successo (cancellazione logica).', datasetId };
  }
}

export const datasetService = new DatasetService();
