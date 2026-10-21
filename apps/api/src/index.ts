import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[SmartLibrary API] Server listening at http://localhost:${config.port}`);
  console.log(`[SmartLibrary API] Environment: ${config.nodeEnv}`);
  console.log(`[SmartLibrary API] Data File: ${config.dataFilePath}`);
  console.log(`[SmartLibrary API] C++ Engine: ${config.cppEnginePath}`);
});
