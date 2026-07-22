# ---------- Stage 1: build the Spring Boot jar ----------
# Maven + JDK 21 (the app compiles with --enable-preview, so it needs JDK 21 exactly).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies: copy the POM first so `dependency:go-offline` only re-runs when the
# POM changes, not on every source edit.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

# `mvn package` runs the full lifecycle: the download-maven-plugin (bound to `initialize`)
# fetches the Sudachi core dict (~70 MB) + JLPT grammar, antrun extracts them into
# target/classes at `process-resources`, so both datasets are baked into the fat jar.
# → No runtime download and no dict volume needed. (Build needs internet for this.)

COPY src ./src
# Skip tests in the image build (they need a live MySQL/Redis); the jar is what we ship.
RUN mvn -B -q clean package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# tzdata so scheduled tasks / timestamps follow local time; wget for the healthcheck.
RUN apk add --no-cache tzdata wget && \
    addgroup -S app && adduser -S app -G app
ENV TZ=Asia/Ho_Chi_Minh

# The Spring Boot fat jar (artifactId starter_project_2025, version 0.0.1-SNAPSHOT).
COPY --from=build /app/target/starter_project_2025-0.0.1-SNAPSHOT.jar app.jar

# Uploads dir (app.file.upload-dir=uploads, relative to WORKDIR). Mount a named volume
# here in compose so user uploads survive a container rebuild.
RUN mkdir -p /app/uploads && chown -R app:app /app
USER app

EXPOSE 8080

# /actuator/health is public (SecurityConfig.PUBLIC_ENDPOINTS) → no auth needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health || exit 1

# --enable-preview is REQUIRED at runtime: the classes were compiled with it.
ENTRYPOINT ["java", "--enable-preview", "-jar", "app.jar"]
