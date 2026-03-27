#!/bin/bash
echo "Starting PostgreSQL..."
sudo service postgresql start

echo "Starting Kafka containers..."
docker start zookeeper 2>/dev/null || docker run -d --name zookeeper -p 2181:2181 zookeeper:3.8
sleep 5
docker start kafka 2>/dev/null || docker run -d --name kafka -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  --link zookeeper confluentinc/cp-kafka:7.5.0

echo "Waiting for Kafka to be ready..."
sleep 15

echo "Starting application..."
mvn spring-boot:run
