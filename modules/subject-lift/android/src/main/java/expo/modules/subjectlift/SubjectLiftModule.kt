package expo.modules.subjectlift

import android.graphics.Bitmap
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.roundToInt

class SubjectLiftModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SubjectLift")

    Function("isAvailable") {
      true
    }

    AsyncFunction("liftSubject") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("ERR_SUBJECT_LIFT_CONTEXT", "React context is not ready", null)
        return@AsyncFunction
      }

      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("ERR_SUBJECT_LIFT_LOAD", "Could not read the photo", e)
        return@AsyncFunction
      }

      val options = SubjectSegmenterOptions.Builder()
        .enableForegroundBitmap()
        .build()

      SubjectSegmentation.getClient(options)
        .process(image)
        .addOnSuccessListener { result ->
          val foreground = result.foregroundBitmap
          if (foreground == null) {
            promise.reject("ERR_SUBJECT_LIFT_EMPTY", "No subject found in the photo", null)
            return@addOnSuccessListener
          }
          try {
            val cutout = scaleDown(cropToContent(foreground))
            val target = File(context.cacheDir, "lift-${UUID.randomUUID()}.png")
            FileOutputStream(target).use { cutout.compress(Bitmap.CompressFormat.PNG, 100, it) }
            promise.resolve(
              mapOf(
                "uri" to Uri.fromFile(target).toString(),
                "width" to cutout.width,
                "height" to cutout.height
              )
            )
          } catch (e: Exception) {
            promise.reject("ERR_SUBJECT_LIFT_ENCODE", "Could not encode the cutout", e)
          }
        }
        .addOnFailureListener { e ->
          promise.reject("ERR_SUBJECT_LIFT_FAILED", e.message ?: "Subject segmentation failed", e)
        }
    }
  }

  /** 투명한 가장자리를 잘라 병만 남긴다. */
  private fun cropToContent(source: Bitmap): Bitmap {
    val width = source.width
    val height = source.height
    val pixels = IntArray(width * height)
    source.getPixels(pixels, 0, width, 0, 0, width, height)

    var left = width
    var top = height
    var right = -1
    var bottom = -1
    for (y in 0 until height) {
      val row = y * width
      for (x in 0 until width) {
        if ((pixels[row + x] ushr 24) > 16) {
          if (x < left) left = x
          if (x > right) right = x
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }
    if (right < left || bottom < top) {
      throw IllegalStateException("Cutout is empty")
    }
    return Bitmap.createBitmap(source, left, top, right - left + 1, bottom - top + 1)
  }

  private fun scaleDown(source: Bitmap, maxSide: Int = 1400): Bitmap {
    val longest = max(source.width, source.height)
    if (longest <= maxSide) return source
    val scale = maxSide.toFloat() / longest
    return Bitmap.createScaledBitmap(
      source,
      (source.width * scale).roundToInt(),
      (source.height * scale).roundToInt(),
      true
    )
  }
}
