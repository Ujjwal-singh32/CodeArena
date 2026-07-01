import { Kafka } from "kafkajs";
import { env } from "./env.js";

let kafka = null;
let producer = null;

export function getKafka() {
  if (!env.kafka.enabled) return null;
  if (!kafka) {
    kafka = new Kafka({
      clientId: env.kafka.clientId,
      brokers: env.kafka.brokers,
    });
  }
  return kafka;
}

export async function getKafkaProducer() {
  if (!env.kafka.enabled) return null;
  if (!producer) {
    const k = getKafka();
    if (!k) return null;
    producer = k.producer();
    try {
      await producer.connect();
    } catch (err) {
      console.warn("Kafka unavailable:", err.message);
      return null;
    }
  }
  return producer;
}

export async function publishEvent(topic, payload) {
  const p = await getKafkaProducer();
  if (!p) {
    console.log(`[kafka:mock] ${topic}`, payload?.event || topic);
    return;
  }
  await p.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
}
