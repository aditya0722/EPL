import app from "./server.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
});
