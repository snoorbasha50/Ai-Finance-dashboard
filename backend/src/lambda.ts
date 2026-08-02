import awsLambdaFastify from "@fastify/aws-lambda";
import { buildApp } from "./app";

let proxy: ReturnType<typeof awsLambdaFastify>;

export const handler = async (
  event: any,
  context: any
): Promise<any> => {
  if (!proxy) {
    const app = await buildApp();

    // Ensures all plugins/routes are registered
    await app.ready();

    proxy = awsLambdaFastify(app);
  }

  return new Promise((resolve, reject) => {
    proxy(event, context, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};