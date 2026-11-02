# Expo SDK 58 + R8: WorkManager creates Room DB / InputMerger by reflection.
# Without keeping <init>(), release builds crash at InitializationProvider.
# See https://github.com/expo/expo/issues/52173
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }
-keepclassmembers class * extends androidx.room.RoomDatabase { public <init>(); }
-keepclassmembers class * extends androidx.work.InputMerger { public <init>(); }

-keep class androidx.work.** { *; }
-keep class androidx.startup.** { *; }
-keep class androidx.sqlite.** { *; }

-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**
