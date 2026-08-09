# Backend container image.
#
# Render, Railway, Fly.io and Cloud Run all deploy a Dockerfile directly.
# Render in particular has no native Java runtime, so this file is what makes
# the backend deployable there at all.
#
# Two stages: the build stage carries Maven and the full JDK (~800MB), the
# runtime stage carries only a JRE. Only the second stage is shipped.

# ---- Stage 1: build ---------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# pom.xml is copied on its own first so Docker can cache the dependency
# download as its own layer. Without this split, every source edit would
# re-download the entire dependency tree on each build.
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline

COPY src ./src
# Tests already run in CI before this image is ever built; running them again
# here would roughly double cold-build time for no extra signal.
RUN mvn -B -ntp -DskipTests package

# ---- Stage 2: runtime -------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as a non-root user. If the process is ever compromised, it should not
# also own the filesystem it is running on.
RUN addgroup -S unitrack && adduser -S unitrack -G unitrack

COPY --from=build /build/target/*.jar app.jar

# The default H2 datasource writes to ./data. The directory has to exist and be
# writable by the non-root user or the app fails on first boot.
RUN mkdir -p /app/data && chown -R unitrack:unitrack /app
USER unitrack

# MaxRAMPercentage rather than a fixed -Xmx: the JVM then sizes the heap from
# the container's actual memory limit, so this works unchanged on a 512MB free
# tier and on a larger paid instance.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseSerialGC"

# Documentation only. The real port comes from $PORT at runtime, which the
# platform injects and application.properties reads.
EXPOSE 8080

# Shell form so $JAVA_OPTS is expanded.
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
