package org.example

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Int,
    val username: String,
    val password: String
    // Note: In a real application, passwords should be handled more securely.
)
