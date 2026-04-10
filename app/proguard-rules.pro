# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in ${sdk.dir}/tools/proguard/proguard-android.txt

# Keep model classes
-keep class com.pusoy.solver.model.** { *; }

# OpenCV
-keep class org.opencv.** { *; }

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# Keep ViewBinding classes
-keep class com.pusoy.solver.databinding.** { *; }
