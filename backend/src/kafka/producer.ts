import { Kafka, Producer } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'finance-producer',
  brokers: [config.kafka.broker],
});

let producer: Producer;

export async function connectProducer(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  logger.info('Kafka producer connected');
}

export async function publishTransaction(transaction: Record<string, unknown>): Promise<void> {
  if (!producer) throw new Error('Kafka producer not connected');

  await producer.send({
    topic: config.kafka.topic,
    messages: [
      {
        key: transaction.id as string,
        value: JSON.stringify(transaction),
      },
    ],
  });

  logger.info({ id: transaction.id }, 'Transaction published to Kafka');
}

export async function disconnectProducer(): Promise<void> {
  if (producer) await producer.disconnect();
}
