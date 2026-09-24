package com.mahalaxmi_borewell.pdf

import android.content.ContentValues
import android.content.Intent
import android.graphics.pdf.PdfDocument
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

class PdfModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PdfModule"

    @ReactMethod
    fun generatePdfFromHtml(html: String, rawFileName: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            val isCompleted = AtomicBoolean(false)
            val mainHandler = Handler(Looper.getMainLooper())
            var offscreenWebView: WebView? = null

            // 15-second safety timeout to guarantee promise never hangs
            val timeoutRunnable = Runnable {
                if (isCompleted.compareAndSet(false, true)) {
                    try {
                        offscreenWebView?.destroy()
                    } catch (_: Exception) {}
                    promise.reject("TIMEOUT", "PDF generation timed out waiting for WebView rendering.")
                }
            }
            mainHandler.postDelayed(timeoutRunnable, 15000)

            try {
                // Sanitize file name: remove invalid characters
                val cleanName = rawFileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                val safeFileName = if (cleanName.endsWith(".pdf", ignoreCase = true)) {
                    cleanName
                } else {
                    "$cleanName.pdf"
                }

                // Standard A4 dimensions in CSS pixels at 96 DPI: 794 x 1123
                val a4BaseWidth = 794
                val a4BaseHeight = 1123

                // High-resolution scale factor (2.5x = ~240-300 DPI high-definition print quality)
                // This eliminates blurry / pixelated text when zooming in on the PDF
                val printScale = 2.5f
                val pageWidth = (a4BaseWidth * printScale).toInt()
                val pageHeight = (a4BaseHeight * printScale).toInt()

                val context = reactContext.currentActivity ?: reactContext
                val webView = WebView(context)
                offscreenWebView = webView

                webView.settings.javaScriptEnabled = true
                webView.settings.defaultTextEncodingName = "utf-8"
                webView.settings.loadWithOverviewMode = true
                webView.settings.useWideViewPort = true
                webView.settings.allowFileAccess = true
                webView.setInitialScale((100 * printScale).toInt())
                webView.layout(0, 0, pageWidth, pageHeight)

                webView.webViewClient = object : WebViewClient() {
                    override fun onReceivedError(
                        view: WebView?,
                        request: WebResourceRequest?,
                        error: WebResourceError?
                    ) {
                        super.onReceivedError(view, request, error)
                        if (request?.isForMainFrame == true) {
                            mainHandler.removeCallbacks(timeoutRunnable)
                            if (isCompleted.compareAndSet(false, true)) {
                                try {
                                    view?.destroy()
                                } catch (_: Exception) {}
                                promise.reject("WEBVIEW_ERROR", "Failed to load HTML: ${error?.description}")
                            }
                        }
                    }

                    override fun onPageFinished(view: WebView?, url: String?) {
                        // Allow layout and image decoding to settle
                        mainHandler.postDelayed({
                            if (isCompleted.get()) return@postDelayed

                            try {
                                if (view == null) {
                                    mainHandler.removeCallbacks(timeoutRunnable)
                                    if (isCompleted.compareAndSet(false, true)) {
                                        promise.reject("NULL_VIEW", "WebView is null on page finish")
                                    }
                                    return@postDelayed
                                }

                                // view.contentHeight is in CSS pixels (at base 100% scale)
                                val cssContentHeight = Math.max(1, view.contentHeight)

                                // CRITICAL FIX FOR 3 EXTRA BLANK PAGES:
                                // Base pagination calculation strictly on unscaled A4 height (1123 CSS px).
                                // For standard single-page quotation (e.g. Q-168, ~650px),
                                // totalPages is Math.ceil(650.0 / 1123) = 1. NO EXTRA BLANK PAGES.
                                // If quotation has many items (> 1123 CSS px), it flows naturally to page 2, 3, etc.
                                val totalPages = Math.max(1, Math.ceil(cssContentHeight.toDouble() / a4BaseHeight).toInt())

                                // High-resolution measured height for rendering buffer
                                val scaledContentHeight = (cssContentHeight * printScale).toInt()
                                val renderHeight = Math.max(pageHeight * totalPages, scaledContentHeight)

                                view.measure(
                                    View.MeasureSpec.makeMeasureSpec(pageWidth, View.MeasureSpec.EXACTLY),
                                    View.MeasureSpec.makeMeasureSpec(renderHeight, View.MeasureSpec.EXACTLY)
                                )
                                view.layout(0, 0, pageWidth, renderHeight)

                                val document = PdfDocument()

                                for (i in 0 until totalPages) {
                                    val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, i + 1).create()
                                    val page = document.startPage(pageInfo)
                                    val canvas = page.canvas
                                    canvas.save()
                                    canvas.translate(0f, (-i * pageHeight).toFloat())
                                    view.draw(canvas)
                                    canvas.restore()
                                    document.finishPage(page)
                                }

                                // 1. Save to temporary cache file first
                                val tempCacheFile = File(reactContext.cacheDir, "temp_${System.currentTimeMillis()}_$safeFileName")
                                FileOutputStream(tempCacheFile).use { output ->
                                    document.writeTo(output)
                                }
                                document.close()

                                try {
                                    view.destroy()
                                } catch (_: Exception) {}

                                saveAndResolve(
                                    tempCacheFile,
                                    safeFileName,
                                    totalPages,
                                    cssContentHeight,
                                    isCompleted,
                                    mainHandler,
                                    timeoutRunnable,
                                    promise
                                )
                            } catch (e: Exception) {
                                mainHandler.removeCallbacks(timeoutRunnable)
                                if (isCompleted.compareAndSet(false, true)) {
                                    promise.reject("PDF_GEN_ERROR", "Error generating or saving PDF: ${e.message}", e)
                                }
                            }
                        }, 500)
                    }
                }

                // Load self-contained HTML with base URL pointing to android_asset
                webView.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "UTF-8", null)
            } catch (e: Exception) {
                mainHandler.removeCallbacks(timeoutRunnable)
                if (isCompleted.compareAndSet(false, true)) {
                    promise.reject("INIT_ERROR", "Failed to initialize PDF generation: ${e.message}", e)
                }
            }
        }
    }

    private fun saveAndResolve(
        tempCacheFile: File,
        safeFileName: String,
        pageCount: Int,
        contentHeight: Int,
        isCompleted: AtomicBoolean,
        mainHandler: Handler,
        timeoutRunnable: Runnable,
        promise: Promise
    ) {
        try {
            val generatedTempPath = tempCacheFile.absolutePath
            var finalSavedUri = ""
            var finalSavedPath = ""
            var finalSavedName = safeFileName

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = reactContext.contentResolver

                // Remove any stale entry with the same name created earlier by this app
                try {
                    resolver.delete(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        "${MediaStore.MediaColumns.DISPLAY_NAME} = ?",
                        arrayOf(safeFileName)
                    )
                } catch (_: Exception) {}

                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, safeFileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }

                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: throw IOException("Failed to create MediaStore entry in Downloads folder")

                resolver.openOutputStream(uri).use { outStream ->
                    if (outStream == null) throw IOException("Failed to open output stream for MediaStore URI: $uri")
                    FileInputStream(tempCacheFile).use { inStream ->
                        inStream.copyTo(outStream)
                    }
                }

                contentValues.clear()
                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, contentValues, null, null)

                finalSavedUri = uri.toString()

                // Resolve actual file name & path from MediaStore
                try {
                    val cursor = resolver.query(
                        uri,
                        arrayOf(MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.MediaColumns.DATA),
                        null,
                        null,
                        null
                    )
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val nameIdx = it.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                            val dataIdx = it.getColumnIndex(MediaStore.MediaColumns.DATA)
                            if (nameIdx != -1) {
                                val n = it.getString(nameIdx)
                                if (!n.isNullOrEmpty()) finalSavedName = n
                            }
                            if (dataIdx != -1) {
                                val p = it.getString(dataIdx)
                                if (!p.isNullOrEmpty()) finalSavedPath = p
                            }
                        }
                    }
                } catch (_: Exception) {}

                if (finalSavedPath.isEmpty()) {
                    finalSavedPath = File(
                        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                        finalSavedName
                    ).absolutePath
                }
            } else {
                // Android 9 and lower: direct file copy to Downloads folder
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs()
                }

                val destFile = File(downloadsDir, safeFileName)
                if (destFile.exists()) {
                    destFile.delete()
                }

                FileInputStream(tempCacheFile).use { inStream ->
                    FileOutputStream(destFile).use { outStream ->
                        inStream.copyTo(outStream)
                    }
                }

                finalSavedPath = destFile.absolutePath
                finalSavedName = destFile.name

                finalSavedUri = try {
                    FileProvider.getUriForFile(
                        reactContext,
                        "${reactContext.packageName}.fileprovider",
                        destFile
                    ).toString()
                } catch (_: Exception) {
                    Uri.fromFile(destFile).toString()
                }
            }

            // Notify media scanner so file manager indexes it immediately
            try {
                MediaScannerConnection.scanFile(
                    reactContext,
                    arrayOf(finalSavedPath),
                    arrayOf("application/pdf"),
                    null
                )
            } catch (_: Exception) {}

            mainHandler.removeCallbacks(timeoutRunnable)
            if (isCompleted.compareAndSet(false, true)) {
                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("uri", finalSavedUri)
                    putString("filePath", finalSavedPath)
                    putString("fileName", finalSavedName)
                    putString("generatedPath", generatedTempPath)
                    putInt("pageCount", pageCount)
                    putInt("contentHeight", contentHeight)
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            mainHandler.removeCallbacks(timeoutRunnable)
            if (isCompleted.compareAndSet(false, true)) {
                promise.reject("SAVE_ERROR", "Error saving PDF to Downloads: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun checkFileExists(uriOrPath: String, promise: Promise) {
        try {
            if (uriOrPath.startsWith("content://")) {
                val uri = Uri.parse(uriOrPath)
                val exists = reactContext.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                    pfd.statSize > 0
                } ?: false
                promise.resolve(exists)
            } else {
                val path = if (uriOrPath.startsWith("file://")) uriOrPath.substring(7) else uriOrPath
                val file = File(path)
                promise.resolve(file.exists() && file.length() > 0)
            }
        } catch (_: Exception) {
            // Check fallback physical file if content uri check failed
            try {
                val path = if (uriOrPath.startsWith("file://")) uriOrPath.substring(7) else uriOrPath
                val file = File(path)
                promise.resolve(file.exists() && file.length() > 0)
            } catch (__: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun findExistingPdf(rawFileName: String, promise: Promise) {
        try {
            val cleanName = rawFileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
            val safeFileName = if (cleanName.endsWith(".pdf", ignoreCase = true)) cleanName else "$cleanName.pdf"

            // 1. Check physical file in Downloads directory
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val directFile = File(downloadsDir, safeFileName)
            if (directFile.exists() && directFile.length() > 0) {
                val uriStr = try {
                    FileProvider.getUriForFile(
                        reactContext,
                        "${reactContext.packageName}.fileprovider",
                        directFile
                    ).toString()
                } catch (_: Exception) {
                    Uri.fromFile(directFile).toString()
                }
                val res = Arguments.createMap().apply {
                    putBoolean("exists", true)
                    putString("uri", uriStr)
                    putString("filePath", directFile.absolutePath)
                    putString("fileName", directFile.name)
                }
                promise.resolve(res)
                return
            }

            // 2. On Android 10+, query MediaStore.Downloads
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = reactContext.contentResolver
                val projection = arrayOf(
                    MediaStore.MediaColumns._ID,
                    MediaStore.MediaColumns.DISPLAY_NAME,
                    MediaStore.MediaColumns.DATA
                )
                val selection = "${MediaStore.MediaColumns.DISPLAY_NAME} = ?"
                val selectionArgs = arrayOf(safeFileName)
                resolver.query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    selectionArgs,
                    "${MediaStore.MediaColumns._ID} DESC"
                )?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val idIdx = cursor.getColumnIndex(MediaStore.MediaColumns._ID)
                        val nameIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                        val dataIdx = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)

                        val id = cursor.getLong(idIdx)
                        val name = cursor.getString(nameIdx)
                        val path = if (dataIdx != -1) cursor.getString(dataIdx) else ""
                        val contentUri = Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id.toString()).toString()

                        var readable = false
                        try {
                            resolver.openFileDescriptor(Uri.parse(contentUri), "r")?.use { pfd ->
                                readable = pfd.statSize > 0
                            }
                        } catch (_: Exception) {}

                        if (readable) {
                            val res = Arguments.createMap().apply {
                                putBoolean("exists", true)
                                putString("uri", contentUri)
                                putString("filePath", path)
                                putString("fileName", name)
                            }
                            promise.resolve(res)
                            return
                        }
                    }
                }
            }

            val notFound = Arguments.createMap().apply {
                putBoolean("exists", false)
            }
            promise.resolve(notFound)
        } catch (e: Exception) {
            val errRes = Arguments.createMap().apply {
                putBoolean("exists", false)
            }
            promise.resolve(errRes)
        }
    }

    @ReactMethod
    fun openPdf(uriOrPath: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val uri: Uri = if (uriOrPath.startsWith("content://")) {
                    Uri.parse(uriOrPath)
                } else {
                    val path = if (uriOrPath.startsWith("file://")) uriOrPath.substring(7) else uriOrPath
                    val file = File(path)
                    if (!file.exists()) {
                        promise.reject("FILE_NOT_FOUND", "File does not exist: $path")
                        return@runOnUiThread
                    }
                    try {
                        FileProvider.getUriForFile(
                            reactContext,
                            "${reactContext.packageName}.fileprovider",
                            file
                        )
                    } catch (e: Exception) {
                        Uri.fromFile(file)
                    }
                }

                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/pdf")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                // Grant read permission to all apps that can handle viewing PDFs
                val packageManager = reactContext.packageManager
                val activities = packageManager.queryIntentActivities(intent, 0)
                for (info in activities) {
                    val pkg = info.activityInfo.packageName
                    try {
                        reactContext.grantUriPermission(pkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    } catch (_: Exception) {}
                }

                val chooser = Intent.createChooser(intent, "Open Quotation PDF").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                try {
                    val activity = reactContext.currentActivity
                    if (activity != null) {
                        activity.startActivity(chooser)
                    } else {
                        reactContext.startActivity(chooser)
                    }
                    promise.resolve(true)
                } catch (activityNotFound: Exception) {
                    promise.reject("NO_PDF_VIEWER", "No PDF viewer is available on this device.")
                }
            } catch (e: Exception) {
                promise.reject("OPEN_FAILED", "Failed to open PDF: ${e.message}", e)
            }
        }
    }
}
