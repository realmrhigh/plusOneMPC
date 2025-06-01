package org.example

import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.ConcurrentHashMap // Using ConcurrentHashMap for thread safety

class InMemoryStorage {
    private val users = ConcurrentHashMap<Int, User>()
    private val idCounter = AtomicInteger(1) // Start IDs from 1

    fun createUser(username: String, password: String): User {
        val newId = idCounter.getAndIncrement()
        val newUser = User(id = newId, username = username, password = password)
        users[newId] = newUser
        return newUser
    }

    fun getUserById(id: Int): User? {
        return users[id]
    }

    fun getUserByUsername(username: String): User? {
        // This will iterate through the values, which can be inefficient for large maps.
        // For a real application, you might want a secondary index (e.g., another map username -> id).
        return users.values.find { it.username == username }
    }
}

// Singleton instance of InMemoryStorage
val storage = InMemoryStorage()
