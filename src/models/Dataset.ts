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
  public id!: string;
  public userId!: string;
  public name!: string;
  public tags!: string[];
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
