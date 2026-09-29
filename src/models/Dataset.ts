import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

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
  declare public id: string;
  declare public userId: string;
  declare public name: string;
  declare public tags: string[];
  declare public isDeleted: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
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
