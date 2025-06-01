package org.example

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.Serializable
import org.slf4j.event.Level

@Serializable
data class HealthStatus(val status: String)

@Serializable
data class ErrorResponse(val error: String)

// Define CreateUserRequest data class for POST /api/users
@Serializable
data class CreateUserRequest(val username: String, val password: String)

fun main() {
    embeddedServer(Netty, port = 5000, host = "0.0.0.0") {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true // Good practice for request bodies
            })
        }

        install(CallLogging) {
            level = Level.INFO
            format { call ->
                val status = call.response.status()
                val httpMethod = call.request.httpMethod.value
                val path = call.request.uri
                val duration = call.processingTimeMillis()
                "$httpMethod $path -> $status (${duration}ms)"
            }
        }

        install(StatusPages) {
            exception<Throwable> { call, cause ->
                // Log the actual error for debugging on the server side
                application.log.error("Unhandled exception", cause)
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorResponse("Internal Server Error: ${cause.localizedMessage ?: cause.javaClass.simpleName}")
                )
            }
            exception<IllegalArgumentException> { call, cause -> // For bad input like non-integer ID
                 call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("Bad Request: ${cause.localizedMessage ?: "Invalid input"}")
                )
            }
        }

        routing {
            get("/health") {
                call.respond(HealthStatus(status = "healthy"))
            }

            route("/api") {
                // POST /users
                post("/users") {
                    val request = call.receive<CreateUserRequest>()
                    if (request.username.isBlank() || request.password.isBlank()) {
                        call.respond(HttpStatusCode.BadRequest, ErrorResponse("Username and password cannot be empty"))
                        return@post
                    }
                    val newUser = storage.createUser(request.username, request.password)
                    call.respond(HttpStatusCode.Created, newUser)
                }

                // GET /users/{id}
                get("/users/{id}") {
                    val idString = call.parameters["id"]
                    val id = idString?.toIntOrNull()
                    if (id == null) {
                        call.respond(HttpStatusCode.BadRequest, ErrorResponse("Invalid user ID format"))
                        return@get
                    }

                    val user = storage.getUserById(id)
                    if (user != null) {
                        call.respond(HttpStatusCode.OK, user)
                    } else {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("User not found"))
                    }
                }

                // GET /users/username/{username}
                get("/users/username/{username}") {
                    val username = call.parameters["username"]
                    if (username == null) {
                        // Should not happen if route is matched, but good practice
                        call.respond(HttpStatusCode.BadRequest, ErrorResponse("Username parameter missing"))
                        return@get
                    }
                    val user = storage.getUserByUsername(username)
                    if (user != null) {
                        call.respond(HttpStatusCode.OK, user)
                    } else {
                        call.respond(HttpStatusCode.NotFound, ErrorResponse("User not found"))
                    }
                }
            }
        }
    }.start(wait = true)
}
