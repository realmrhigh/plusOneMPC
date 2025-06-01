# Kotlin Server

This is a simple RESTful API server built using Kotlin and Ktor. It provides basic user management functionalities and demonstrates common server-side patterns.

## Prerequisites

To build and run this project locally, you will need:

-   JDK 17 or higher
-   Gradle 8.7 or higher (the project uses the Gradle wrapper, so having Gradle installed locally is optional if you use `./gradlew`)

## Running Locally

1.  **Build the project and create the fat JAR:**
    Open a terminal in the `kotlin_server` directory and run:
    ```bash
    ./gradlew :app:clean :app:shadowJar
    ```
    This command cleans previous builds and creates a self-contained JAR in `app/build/libs/`. The JAR is typically named `app-all.jar`.

2.  **Run the server:**
    Once the JAR is built, you can run the server using:
    ```bash
    java -jar app/build/libs/app-all.jar
    ```

3.  The server will start on port `5000`.

## Running with Docker

1.  **Build the Docker image:**
    Ensure Docker is installed and running. Open a terminal in the `kotlin_server` directory and run:
    ```bash
    docker build -t kotlin-server .
    ```

2.  **Run the Docker container:**
    After the image is built, run the container using:
    ```bash
    docker run -p 5000:5000 kotlin-server
    ```
    This will map port 5000 on your host to port 5000 in the container.

## API Endpoints

The following API endpoints are available:

-   **GET `/health`**:
    -   Purpose: Checks the health status of the server.
    -   Response: `{"status": "healthy"}`

-   **POST `/api/users`**:
    -   Purpose: Creates a new user.
    -   Request Body (JSON): `{"username": "your_username", "password": "your_password"}`
    -   Response: The created `User` object with an `id`.

-   **GET `/api/users/{id}`**:
    -   Purpose: Retrieves a user by their ID.
    -   Response: The `User` object if found, otherwise a 404 error.

-   **GET `/api/users/username/{username}`**:
    -   Purpose: Retrieves a user by their username.
    -   Response: The `User` object if found, otherwise a 404 error.
