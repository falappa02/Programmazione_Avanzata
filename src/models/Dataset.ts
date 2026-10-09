import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import type { Content } from './Content';

export interface DatasetAttributes {
  id?: string;
  userId: string;
  name: string;
  tags: string[];
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Dataset extends Model<DatasetAttributes> implements DatasetAttributes {
  declare id: string;
  declare userId: string;
  declare name: string;
  declare tags: string[];
  declare isDeleted: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare contents?: Content[];
}

Dataset.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'datasets',
    timestamps: true,
  }
);
