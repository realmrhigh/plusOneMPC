# Stage 1: Build the application
FROM gradle:8.7.0-jdk17-jammy AS build

# Set the working directory in the container
WORKDIR /home/gradle/project

# Copy the entire project (respecting .dockerignore)
COPY . .

# Grant execution rights to gradlew
RUN chmod +x ./gradlew

# Build the application and create a shadow JAR
# We specify :app:shadowJar to ensure it runs for the 'app' subproject
# and :app:build to ensure all necessary artifacts are built.
RUN ./gradlew :app:clean :app:build :app:shadowJar --no-daemon

# Stage 2: Create the runtime image
FROM amazoncorretto:17-alpine-jre

WORKDIR /app

# Copy the shadow JAR from the build stage
# The name 'app-all.jar' is a common convention for shadow JARs.
# If your shadowJar task names it differently (e.g., based on project name/version), adjust this path.
# Example: app/build/libs/kotlin_server-app-all.jar or app/build/libs/app-all.jar
# Based on standard gradle init, the subproject is 'app', so the JAR will likely be app-all.jar or app-shadow.jar
COPY --from=build /home/gradle/project/app/build/libs/app-all.jar .

# Expose the port the server runs on (as configured in App.kt)
EXPOSE 5000

# Set the entry point to run the JAR
ENTRYPOINT ["java", "-jar", "app-all.jar"]
