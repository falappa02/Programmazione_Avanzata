import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { IInferenceResult } from '../types';

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
  resultJson?: IInferenceResult | null;
  outputFolderPath?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Processing extends Model<ProcessingAttributes> implements ProcessingAttributes {
  declare id: string;
  declare datasetId: string;
  declare userId: string;
  declare modelId: string;
  declare status: ProcessingStatus;
  declare totalCost: number;
  declare errorType: string | null;
  declare errorDetails: string | null;
  declare resultJson: IInferenceResult | null;
  declare outputFolderPath: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
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
