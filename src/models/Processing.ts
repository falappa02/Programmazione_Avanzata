import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type ProcessingStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED';

export interface ProcessingAttributes {
  id?: string;
  datasetId: string;
  userId: string;
  modelId: string;
  status: ProcessingStatus;
  totalCost: number;
  errorType?: string | null;
  errorDetails?: string | null;
  resultJson?: any;
  outputFolderPath?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Processing extends Model<ProcessingAttributes> implements ProcessingAttributes {
  declare public id: string;
  declare public datasetId: string;
  declare public userId: string;
  declare public modelId: string;
  declare public status: ProcessingStatus;
  declare public totalCost: number;
  declare public errorType: string | null;
  declare public errorDetails: string | null;
  declare public resultJson: any;
  declare public outputFolderPath: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Processing.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    modelId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'yolov11n',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ABORTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    totalCost: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    errorType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    errorDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resultJson: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    outputFolderPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'processings',
    timestamps: true,
  }
);
