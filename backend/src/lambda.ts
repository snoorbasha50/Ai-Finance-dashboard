import awsLambdaFastify from "@fastify/aws-lambda";
import mongoose from "mongoose";
import { buildApp } from "./app";
import { config } from "./config";

let proxy: ReturnType<typeof awsLambdaFastify>;
let isConnected = false;

export const handler = async (
  event: any,
  context: any
): Promise<any> => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!proxy) {
    const app = await buildApp();

    if (!isConnected) {
      await mongoose.connect(config.mongodb.uri);
      isConnected = true;
    }

    // ❌ Don't call app.ready()

    proxy = awsLambdaFastify(app);
  }

  return new Promise((resolve, reject) => {
    proxy(event, context, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};