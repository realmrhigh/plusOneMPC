package com.example.kotlindrummachine

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.serializer

object PersistenceManager {

    private fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences("DrumMachinePrefs", Context.MODE_PRIVATE)

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
        isLenient = true // Allow for some flexibility, e.g. if data model changes slightly
    }

    // Keys
    private const val KEY_PATTERNS = "patterns_v1" // Added versioning in case model changes
    private const val KEY_KITS = "kits_v1"
    const val KEY_TEMPO = "tempo_v1" // Made public for ViewModel access
    const val KEY_CURRENT_PATTERN_ID = "current_pattern_id_v1"
    const val KEY_ACTIVE_KIT_ID = "active_kit_id_v1"
    const val KEY_METRONOME_ENABLED = "metronome_enabled_v1"
    const val KEY_METRONOME_VOLUME = "metronome_volume_v1"
    const val KEY_16_LEVELS_ACTIVE = "16_levels_active_v1"    // New key
    const val KEY_16_LEVELS_SOURCE_PAD_ID = "16_levels_source_pad_id_v1" // New key
    // Add more keys as needed

    // Generic Save/Load for lists of serializable objects
    private inline fun <reified T> saveList(context: Context, key: String, list: List<T>, serializer: KSerializer<List<T>>) {
        try {
            val jsonString = json.encodeToString(serializer, list)
            getPrefs(context).edit().putString(key, jsonString).apply()
        } catch (e: Exception) {
            // Log error or handle
            android.util.Log.e("PersistenceManager", "Error saving list for key $key", e)
        }
    }

    private inline fun <reified T> loadList(context: Context, key: String, serializer: KSerializer<List<T>>): List<T> {
        return try {
            val jsonString = getPrefs(context).getString(key, null)
            if (jsonString != null) {
                json.decodeFromString(serializer, jsonString)
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            // Log error or handle
            android.util.Log.e("PersistenceManager", "Error loading list for key $key", e)
            emptyList()
        }
    }

    // Specific Save/Load functions
    fun savePatterns(context: Context, patterns: List<Pattern>) {
        saveList(context, KEY_PATTERNS, patterns, ListSerializer(Pattern.serializer()))
    }

    fun loadPatterns(context: Context): List<Pattern> {
        return loadList(context, KEY_PATTERNS, ListSerializer(Pattern.serializer()))
    }

    fun saveKits(context: Context, kits: List<DrumKit>) {
        saveList(context, KEY_KITS, kits, ListSerializer(DrumKit.serializer()))
    }

    fun loadKits(context: Context): List<DrumKit> {
        return loadList(context, KEY_KITS, ListSerializer(DrumKit.serializer()))
    }

    // Basic Save/Load for Int, String, Boolean
    fun saveInt(context: Context, key: String, value: Int) {
        getPrefs(context).edit().putInt(key, value).apply()
    }

    fun loadInt(context: Context, key: String, defaultValue: Int): Int {
        return getPrefs(context).getInt(key, defaultValue)
    }

    fun saveString(context: Context, key: String, value: String?) {
        getPrefs(context).edit().putString(key, value).apply()
    }

    fun loadString(context: Context, key: String, defaultValue: String?): String? {
        return getPrefs(context).getString(key, defaultValue)
    }

    fun saveBoolean(context: Context, key: String, value: Boolean) {
        getPrefs(context).edit().putBoolean(key, value).apply()
    }

    fun loadBoolean(context: Context, key: String, defaultValue: Boolean): Boolean {
        return getPrefs(context).getBoolean(key, defaultValue)
    }

    fun saveFloat(context: Context, key: String, value: Float) {
        getPrefs(context).edit().putFloat(key, value).apply()
    }

    fun loadFloat(context: Context, key: String, defaultValue: Float): Float {
        return getPrefs(context).getFloat(key, defaultValue)
    }
}
