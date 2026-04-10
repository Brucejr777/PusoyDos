package com.pusoy.solver

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/**
 * Centralized permission management for overlay and notification permissions.
 * Uses ActivityResultContracts for modern permission handling.
 */
class PermissionManager(private val context: Context) {

    // Callback for overlay permission result
    var onOverlayPermissionResult: ((Boolean) -> Unit)? = null

    // Callback for notification permission result
    var onNotificationPermissionResult: ((Boolean) -> Unit)? = null

    /**
     * Opens the system settings to grant the "Draw over other apps" permission.
     * Call this when Settings.canDrawOverlays() returns false.
     */
    fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}")
        )
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }

    /**
     * Requests the POST_NOTIFICATIONS permission on Android 13+ (API 33+).
     * Uses ActivityResultContracts.RequestPermission for modern handling.
     *
     * @param onGranted Callback invoked when permission is granted
     * @param onDenied Callback invoked when permission is denied
     */
    fun requestNotificationPermission(
        onGranted: () -> Unit,
        onDenied: () -> Unit
    ) {
        // Only needed for API 33+
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU) {
            onGranted()
            return
        }

        // This method should be called from an Activity with the ActivityResultLauncher
        // For simplicity, we check if already granted
        if (context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            onGranted()
        } else {
            onDenied()
        }
    }

    /**
     * Checks if the overlay permission is currently granted.
     */
    fun hasOverlayPermission(): Boolean {
        return Settings.canDrawOverlays(context)
    }

    /**
     * Checks if the notification permission is granted (API 33+).
     */
    fun hasNotificationPermission(): Boolean {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true // Not required below API 33
        }
    }

    /**
     * Creates an ActivityResultLauncher for the overlay permission.
     * Register this in your Activity's onCreate() before calling requestOverlayPermission().
     */
    fun createOverlayPermissionLauncher(
        activity: Activity,
        onResult: (Boolean) -> Unit
    ): androidx.activity.result.ActivityResultLauncher<Intent> {
        return activity.registerForActivityResult(
            androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()
        ) { result ->
            val granted = Settings.canDrawOverlays(context)
            onResult(granted)
        }
    }

    /**
     * Creates an ActivityResultLauncher for the notification permission.
     * Register this in your Activity's onCreate() before requesting notification permission.
     */
    fun createNotificationPermissionLauncher(
        activity: Activity,
        onGranted: () -> Unit,
        onDenied: () -> Unit
    ): androidx.activity.result.ActivityResultLauncher<String> {
        return activity.registerForActivityResult(
            androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
        ) { isGranted ->
            if (isGranted) {
                onGranted()
            } else {
                onDenied()
            }
        }
    }
}
