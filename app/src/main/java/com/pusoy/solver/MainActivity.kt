package com.pusoy.solver

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.pusoy.solver.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var permissionManager: PermissionManager

    private var isServiceRunning = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        permissionManager = PermissionManager(this)

        setupUI()
        checkPermissions()
    }

    private fun setupUI() {
        binding.btnStart.setOnClickListener {
            startOverlayService()
        }

        binding.btnStop.setOnClickListener {
            stopOverlayService()
        }
    }

    private fun checkPermissions() {
        // Check overlay permission
        if (!Settings.canDrawOverlays(this)) {
            updateStatus("Overlay permission required. Tap 'Grant Permissions' to continue.")
            binding.btnStart.isEnabled = false
        } else {
            updateStatus("Ready. Tap 'Start' to begin overlay.")
            binding.btnStart.isEnabled = true
        }

        // Request notification permission for Android 13+
        permissionManager.requestNotificationPermission(
            onGranted = {
                updateStatus("All permissions granted. Ready to start.")
            },
            onDenied = {
                updateStatus("Notification permission denied. Overlay may not work properly.")
            }
        )
    }

    private fun startOverlayService() {
        if (!Settings.canDrawOverlays(this)) {
            permissionManager.requestOverlayPermission()
            return
        }

        lifecycleScope.launch {
            val serviceIntent = Intent(this@MainActivity, OverlayService::class.java)
            ContextCompat.startForegroundService(this@MainActivity, serviceIntent)
            isServiceRunning = true
            updateStatus("Overlay service started.")
            binding.btnStart.isEnabled = false
            binding.btnStop.isEnabled = true
        }
    }

    private fun stopOverlayService() {
        val serviceIntent = Intent(this, OverlayService::class.java)
        stopService(serviceIntent)
        isServiceRunning = false
        updateStatus("Overlay service stopped.")
        binding.btnStart.isEnabled = true
        binding.btnStop.isEnabled = false
    }

    private fun updateStatus(message: String) {
        binding.tvStatus.text = message
    }

    override fun onResume() {
        super.onResume()
        // Re-check overlay permission when returning to app
        if (Settings.canDrawOverlays(this)) {
            binding.btnStart.isEnabled = !isServiceRunning
            updateStatus(if (isServiceRunning) "Overlay service running." else "Ready. Tap 'Start' to begin overlay.")
        }
    }
}
