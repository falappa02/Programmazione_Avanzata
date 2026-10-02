import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { sequelize } from '../config/database';
import { User, Dataset, Content } from '../models';

async function seed() {
  console.log('[SEED] Initializing Database Seed...');
  await sequelize.sync({ force: true });

  const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
  const hashedUserPassword = await bcrypt.hash('User123!', 10);

  // 1. Create Default Users
  const admin = await User.create({
    email: 'admin@univpm.it',
    password: hashedAdminPassword,
    role: 'admin',
    tokens: 2000.0,
  });

  const user1 = await User.create({
    email: 'user1@univpm.it',
    password: hashedUserPassword,
    role: 'user',
    tokens: 500.0,
  });

  const user2 = await User.create({
    email: 'user2@univpm.it',
    password: hashedUserPassword,
    role: 'user',
    tokens: 25.0,
  });

  console.log('[SEED] Users created successfully:');
  console.log(` - Admin: admin@univpm.it (Password: Admin123!)`);
  console.log(` - User 1: user1@univpm.it (Password: User123!, Tokens: 500)`);
  console.log(` - User 2: user2@univpm.it (Password: User123!, Tokens: 25)`);

  // Ensure uploads directory exists and contains sample dummy images
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const sampleImagePath1 = path.join(uploadsDir, 'sample_traffic.jpg');
  const sampleImagePath2 = path.join(uploadsDir, 'sample_pedestrian.jpg');
  const sampleImagePath3 = path.join(uploadsDir, 'sample_wildlife.jpg');
  const sampleVideoPath = path.join(uploadsDir, 'sample_surveillance.mp4');

  // Create dummy image files if missing
  const dummyPixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  if (!fs.existsSync(sampleImagePath1)) fs.writeFileSync(sampleImagePath1, dummyPixel);
  if (!fs.existsSync(sampleImagePath2)) fs.writeFileSync(sampleImagePath2, dummyPixel);
  if (!fs.existsSync(sampleImagePath3)) fs.writeFileSync(sampleImagePath3, dummyPixel);

  // If a sample video does not exist, reuse an existing mp4 in uploads or generate a placeholder
  if (!fs.existsSync(sampleVideoPath)) {
    const existingMp4 = fs.readdirSync(uploadsDir).find((f) => f.endsWith('.mp4') && f !== 'sample_surveillance.mp4');
    if (existingMp4) {
      fs.copyFileSync(path.join(uploadsDir, existingMp4), sampleVideoPath);
    } else {
      fs.writeFileSync(sampleVideoPath, Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]));
    }
  }

  const videoStats = fs.existsSync(sampleVideoPath) ? fs.statSync(sampleVideoPath) : null;
  const videoSizeKb = videoStats ? Math.round((videoStats.size / 1024) * 100) / 100 : 250.0;
  const videoFrames = 10;
  const videoUploadCost = Math.round(videoSizeKb * 0.08 * 100) / 100;

  const user1Id = user1.id || (user1 as any).getDataValue?.('id');

  // 2. Create 3 Sample Datasets (Requirement: At least 3 datasets for demo)
  const ds1 = await Dataset.create({
    userId: user1Id,
    name: 'Traffic Monitoring Dataset',
    tags: ['vehicles', 'traffic', 'urban', 'yolo'],
    isDeleted: false,
  });

  const ds2 = await Dataset.create({
    userId: user1Id,
    name: 'Pedestrian Surveillance Dataset',
    tags: ['people', 'security', 'cctv'],
    isDeleted: false,
  });

  const ds3 = await Dataset.create({
    userId: user1Id,
    name: 'Wildlife Detection Dataset',
    tags: ['animals', 'nature', 'outdoor'],
    isDeleted: false,
  });

  const ds1Id = ds1.id || (ds1 as any).getDataValue?.('id');
  const ds2Id = ds2.id || (ds2 as any).getDataValue?.('id');
  const ds3Id = ds3.id || (ds3 as any).getDataValue?.('id');

  // 3. Populate Sample Contents (Images and MP4 Video)
  await Content.create({
    datasetId: ds1Id,
    type: 'image',
    filePath: sampleImagePath1,
    originalName: 'city_traffic_intersection.jpg',
    fileSizeKb: 245.5,
    frameCount: 1,
    tokenCost: 0.25,
  });

  await Content.create({
    datasetId: ds2Id,
    type: 'image',
    filePath: sampleImagePath2,
    originalName: 'street_crossing.jpg',
    fileSizeKb: 180.2,
    frameCount: 1,
    tokenCost: 0.25,
  });

  await Content.create({
    datasetId: ds2Id,
    type: 'video',
    filePath: sampleVideoPath,
    originalName: 'cctv_surveillance_pedestrians.mp4',
    fileSizeKb: videoSizeKb,
    frameCount: videoFrames,
    tokenCost: videoUploadCost,
  });

  await Content.create({
    datasetId: ds3Id,
    type: 'image',
    filePath: sampleImagePath3,
    originalName: 'forest_wildlife.jpg',
    fileSizeKb: 310.0,
    frameCount: 1,
    tokenCost: 0.25,
  });

  console.log('[SEED] Created 3 Datasets and sample content items (including MP4 video) successfully.');
  console.log('[SEED] Database seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
