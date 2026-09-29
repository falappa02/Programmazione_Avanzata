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
  public id!: string;
  public datasetId!: string;
  public userId!: string;
  public modelId!: string;
  public status!: ProcessingStatus;
  public totalCost!: number;
  public errorType!: string | null;
  public errorDetails!: string | null;
  public resultJson!: any;
  public outputFolderPath!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
