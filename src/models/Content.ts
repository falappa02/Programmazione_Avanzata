import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ContentAttributes {
  id?: string;
  datasetId: string;
  type: 'image' | 'video';
  filePath: string;
  originalName: string;
  fileSizeKb: number;
  frameCount: number;
  tokenCost: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Content extends Model<ContentAttributes> implements ContentAttributes {
  declare id: string;
  declare datasetId: string;
  declare type: 'image' | 'video';
  declare filePath: string;
  declare originalName: string;
  declare fileSizeKb: number;
  declare frameCount: number;
  declare tokenCost: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Content.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    datasetId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('image', 'video'),
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileSizeKb: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    frameCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    tokenCost: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'contents',
    timestamps: true,
  }
);
