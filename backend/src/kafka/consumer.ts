import { Kafka, Consumer } from 'kafkajs';
import { Server as SocketServer } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Transaction } from '../models/transaction.model';

const kafka = new Kafka({
  clientId: 'finance-consumer',
  brokers: [config.kafka.broker],
});

let consumer: Consumer;

export async function connectConsumer(io: SocketServer): Promise<void> {
  consumer = kafka.consumer({ groupId: config.kafka.groupId });
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafka.topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const transaction = JSON.parse(message.value.toString());

        // Only save to MongoDB if source is 'kafka' (mock transactions)
        // Upload-sourced transactions are already saved by the upload route
        if (transaction.source === 'kafka') {
          await Transaction.create(transaction);
          logger.info({ id: transaction.id }, 'Mock transaction saved by consumer');
        }

        // Push real-time update to all connected browsers
        io.emit('new-transaction', transaction);
        logger.info({ id: transaction.id }, 'Transaction pushed via Socket.io');
      } catch (err) {
        logger.error({ err }, 'Error processing Kafka message');
      }
    },
  });

  logger.info('Kafka consumer connected and listening on topic: ' + config.kafka.topic);
}

export async function disconnectConsumer(): Promise<void> {
  if (consumer) await consumer.disconnect();
}
