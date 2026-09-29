import { User } from './User';
import { Dataset } from './Dataset';
import { Content } from './Content';
import { Processing } from './Processing';

// Associations
User.hasMany(Dataset, { foreignKey: 'userId', as: 'datasets' });
Dataset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Dataset.hasMany(Content, { foreignKey: 'datasetId', as: 'contents' });
Content.belongsTo(Dataset, { foreignKey: 'datasetId', as: 'dataset' });

User.hasMany(Processing, { foreignKey: 'userId', as: 'processings' });
Processing.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Dataset.hasMany(Processing, { foreignKey: 'datasetId', as: 'processings' });
Processing.belongsTo(Dataset, { foreignKey: 'datasetId', as: 'dataset' });

export { User, Dataset, Content, Processing };
