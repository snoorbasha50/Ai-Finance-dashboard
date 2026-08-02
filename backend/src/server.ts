import mongoose from "mongoose";
import { buildApp } from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";

async function start() {
    try {
        const app = await buildApp();
        console.log(config.mongodb.uri);
        await mongoose.connect(config.mongodb.uri);
        logger.info("MongoDB connected",config.mongodb.uri);

        await app.listen({
            host: "0.0.0.0",
            port: config.port,
        });

        logger.info(`Server running on http://localhost:${config.port}`);
        logger.info(
            `GraphQL playground at http://localhost:${config.port}/graphiql`
        );
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

start();