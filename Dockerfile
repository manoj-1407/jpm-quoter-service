# Multi-stage build — jpm-quoter-service
# Place in root of jpm-quoter-service/

FROM maven:3.9.7-eclipse-temurin-17-alpine AS builder
WORKDIR /build
COPY pom.xml .
# Download deps first (layer cache)
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000

COPY --from=builder /build/target/*.jar app.jar

# Extract layers for better caching
RUN java -Djarmode=layertools -jar app.jar extract

# Final minimal image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000 \
    && mkdir -p /app/logs /tmp/spring \
    && chown -R appuser:appgroup /app /tmp/spring

COPY --from=runtime /app/dependencies/ ./
COPY --from=runtime /app/spring-boot-loader/ ./
COPY --from=runtime /app/snapshot-dependencies/ ./
COPY --from=runtime /app/application/ ./

USER appuser

ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:InitialRAMPercentage=50.0 \
               -XX:+ExitOnOutOfMemoryError \
               -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
