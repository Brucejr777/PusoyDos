package com.pusoy.solver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.pusoy.solver.ui.CardOverlayView

/**
 * Foreground service that manages the card suggestion overlay window.
 * Creates a system overlay using TYPE_APPLICATION_OVERLAY that persists
 * on top of other apps.
 *
 * TODO: Integrate MediaProjection screen capture here
 * TODO: Add card detection logic to analyze game screen
 * TODO: Connect solver algorithm to generate optimal plays
 */
class OverlayService : Service() {

    private val CHANNEL_ID = "pusoy_overlay_channel"
    private val NOTIFICATION_ID = 1001

    private var overlayView: CardOverlayView? = null
    private var windowManager: WindowManager? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Start as foreground service with notification
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        // Show the overlay window
        showOverlay()

        // TODO: Integrate MediaProjection screen capture here
        // - Request MediaProjection permission via Intent
        // - Create VirtualDisplay to capture screen content
        // - Process frames through OpenCV for card detection

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
    }

    /**
     * Creates the notification channel required for foreground services (API 26+).
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Pusoy Dos Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows card suggestions while playing"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Creates the persistent foreground service notification.
     */
    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pusoy Dos Solver")
            .setContentText("Overlay active - showing card suggestions")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    /**
     * Adds the card overlay to the system window manager.
     */
    private fun showOverlay() {
        if (overlayView != null) return

        overlayView = CardOverlayView(this).apply {
            // TODO: Update text dynamically from solver
            setSuggestionText("Play: Pair of 5s")

            setOnCloseListener {
                // Optional: handle overlay close from UI
            }
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 100
        }

        windowManager?.addView(overlayView, params)
    }

    /**
     * Removes the overlay from the window manager.
     */
    private fun removeOverlay() {
        overlayView?.let { view ->
            try {
                windowManager?.removeView(view)
            } catch (e: IllegalArgumentException) {
                // View was not attached, ignore
            }
            overlayView = null
        }
    }
}
