import { Dataset, Content } from '../models';
import { ErrorFactory } from '../errors';
import { Op } from 'sequelize';

export class DatasetService {
  /**
   * Create a new empty dataset for user.
   */
  public async createDataset(userId: string, name: string, tags: string[] = []) {
    // Check if user already has an active dataset with the same name
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

    const dataset = await Dataset.create({
      userId,
      name,
      tags,
      isDeleted: false,
    });

    return dataset;
  }

  /**
   * Get active dataset list for user.
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
   * Update dataset metadata (name, tags), checking name non-overlap among user's projects.
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
      dataset.tags = tags;
    }

    await dataset.save();
    return dataset;
  }

  /**
   * Soft delete (logical deletion) of a dataset.
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
