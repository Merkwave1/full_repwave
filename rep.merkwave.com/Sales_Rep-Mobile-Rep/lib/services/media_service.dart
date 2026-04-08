// lib/services/media_service.dart
import 'dart:io';
import 'dart:async';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart'; // For temporary directory
import 'package:path/path.dart' as p; // Import path for path manipulation

class MediaService extends GetxService {
  final Rx<File?> selectedImage = Rx<File?>(null); // Observable for the selected image (can be any file)

  // ** NEW METHOD TO CLEAR THE IMAGE **
  void clearImage() {
    selectedImage.value = null;
  }

  // ** NEW METHOD: Pick image and return it directly **
  Future<File?> pickImageAndReturn() async {
    final Completer<File?> completer = Completer<File?>();
    bool isProcessing = false; // Track if we're processing an image

    Get.bottomSheet(
      Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.camera_alt),
            title: Text('take_photo'.tr),
            onTap: () async {
              isProcessing = true; // Mark as processing
              UltraSafeNavigation.back(Get.context); // Close bottom sheet
              try {
                final ImagePicker picker = ImagePicker();
                final XFile? image = await picker.pickImage(
                  source: ImageSource.camera,
                  preferredCameraDevice: CameraDevice.rear,
                  imageQuality: 80,
                  maxWidth: 1080,
                  maxHeight: 1080,
                );
                if (image != null) {
                  print('MediaService: Camera image selected, compressing...');
                  final compressedFile = await _compressImage(File(image.path));
                  print('MediaService: Image compressed, completing with: ${compressedFile?.path ?? "null"}');
                  if (!completer.isCompleted) {
                    completer.complete(compressedFile);
                  }
                } else {
                  print('MediaService: Camera selection cancelled by user');
                  if (!completer.isCompleted) {
                    completer.complete(null);
                  }
                }
              } catch (e) {
                print('MediaService: Camera error: $e');
                AppNotifier.error('Failed to access camera: ${e.toString()}', title: 'Camera Error');
                if (!completer.isCompleted) {
                  completer.complete(null);
                }
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.insert_drive_file),
            title: Text('select_file'.tr),
            onTap: () async {
              isProcessing = true; // Mark as processing
              UltraSafeNavigation.back(Get.context); // Close bottom sheet
              try {
                final FilePickerResult? result = await FilePicker.platform.pickFiles(
                  type: FileType.custom,
                  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
                );
                if (result != null && result.files.single.path != null) {
                  print('MediaService: File selected: ${result.files.single.path}');
                  final File selectedFile = File(result.files.single.path!);

                  // Check if it's an image, compress it
                  final String extension = p.extension(selectedFile.path).toLowerCase();
                  if (['.jpg', '.jpeg', '.png'].contains(extension)) {
                    print('MediaService: File is an image, compressing...');
                    final compressedFile = await _compressImage(selectedFile);
                    if (!completer.isCompleted) {
                      completer.complete(compressedFile);
                    }
                  } else {
                    // For non-image files (PDFs, documents), use as is
                    print('MediaService: File is not an image, using as is');
                    if (!completer.isCompleted) {
                      completer.complete(selectedFile);
                    }
                  }
                } else {
                  print('MediaService: File selection cancelled by user');
                  if (!completer.isCompleted) {
                    completer.complete(null);
                  }
                }
              } catch (e) {
                print('MediaService: File picker error: $e');
                AppNotifier.error('Failed to select file: ${e.toString()}', title: 'File Picker Error');
                if (!completer.isCompleted) {
                  completer.complete(null);
                }
              }
            },
          ),
        ],
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isDismissible: true,
      enableDrag: true,
    ).then((_) {
      // Only complete with null if user dismissed without selecting
      if (!completer.isCompleted && !isProcessing) {
        print('MediaService: Bottom sheet dismissed without selection');
        completer.complete(null);
      }
    });

    final File? result = await completer.future;
    print('MediaService: pickImageAndReturn returning: ${result?.path ?? "null"}');
    return result;
  }

  Future<void> pickImageFromSource() async {
    Get.bottomSheet(
      Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.camera_alt),
            title: Text('take_photo'.tr),
            onTap: () async {
              UltraSafeNavigation.back(Get.context); // Close bottom sheet safely
              try {
                final ImagePicker picker = ImagePicker();
                final XFile? image = await picker.pickImage(
                  source: ImageSource.camera,
                  preferredCameraDevice: CameraDevice.rear, // FIXED: Use back camera
                  imageQuality: 80,
                  maxWidth: 1080,
                  maxHeight: 1080,
                );
                if (image != null) {
                  await _compressAndSetImage(File(image.path));
                } else {
                  print('MediaService: Camera selection cancelled by user');
                }
              } catch (e) {
                print('MediaService: Camera error: $e');
                AppNotifier.error('Failed to access camera: ${e.toString()}', title: 'Camera Error');
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.insert_drive_file),
            title: Text('select_file'.tr),
            onTap: () async {
              UltraSafeNavigation.back(Get.context); // Close bottom sheet safely
              try {
                final FilePickerResult? result = await FilePicker.platform.pickFiles(
                  type: FileType.custom,
                  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'],
                );
                if (result != null && result.files.single.path != null) {
                  print('MediaService: File selected: ${result.files.single.path}');
                  final File selectedFile = File(result.files.single.path!);

                  // Check if it's an image, compress it
                  final String extension = p.extension(selectedFile.path).toLowerCase();
                  if (['.jpg', '.jpeg', '.png'].contains(extension)) {
                    print('MediaService: File is an image, compressing...');
                    await _compressAndSetImage(selectedFile);
                  } else {
                    // For non-image files (PDFs, documents), use as is
                    print('MediaService: File is not an image, using as is');
                    selectedImage.value = selectedFile;
                  }
                } else {
                  print('MediaService: File selection cancelled by user');
                }
              } catch (e) {
                print('MediaService: File picker error: $e');
                AppNotifier.error('Failed to select file: ${e.toString()}', title: 'File Picker Error');
              }
            },
          ),
        ],
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    );
  }

  Future<void> captureImageFromCamera() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear,
        imageQuality: 80,
        maxWidth: 1080,
        maxHeight: 1080,
      );
      if (image != null) {
        await _compressAndSetImage(File(image.path));
      } else {
        print('MediaService: Camera capture cancelled by user');
      }
    } catch (e) {
      print('MediaService: Camera capture error: $e');
      AppNotifier.error('Failed to access camera: ${e.toString()}', title: 'Camera Error');
    }
  }

  // Private method to compress and set the image
  Future<void> _compressAndSetImage(File imageFile) async {
    try {
      final compressedFile = await _compressImage(imageFile);
      selectedImage.value = compressedFile;
    } catch (e) {
      print('MediaService: Error processing image: $e');
      AppNotifier.error('Failed to process selected image: ${e.toString()}', title: 'Image Processing Error');
      selectedImage.value = null;
    }
  }

  // ** NEW: Separate compress method that returns File **
  Future<File?> _compressImage(File imageFile) async {
    try {
      final int originalSize = await imageFile.length();
      print('MediaService: Original image size: ${originalSize / 1024} KB');

      // Target size in bytes (500 KB)
      const int targetSize = 500 * 1024;

      if (originalSize <= targetSize) {
        print('MediaService: Image is already within size limit. Size: ${originalSize / 1024} KB');
        return imageFile;
      }

      // Get temporary directory for compressed image
      final Directory tempDir = await getTemporaryDirectory();
      final String targetPath = p.join(tempDir.path, '${DateTime.now().millisecondsSinceEpoch}.jpg');

      XFile? compressedImage = await FlutterImageCompress.compressAndGetFile(
        imageFile.path,
        targetPath,
        minWidth: 1080,
        minHeight: 1080,
        quality: 85,
        format: CompressFormat.jpeg,
      );

      if (compressedImage != null) {
        int compressedSize = await compressedImage.length();
        print('MediaService: Initial compressed image size: ${compressedSize / 1024} KB');

        // If still too large, reduce quality further iteratively
        int currentQuality = 85;
        while (compressedSize > targetSize && currentQuality > 10) {
          currentQuality -= 5;
          compressedImage = await FlutterImageCompress.compressAndGetFile(
            imageFile.path,
            targetPath,
            minWidth: 1080,
            minHeight: 1080,
            quality: currentQuality,
            format: CompressFormat.jpeg,
          );
          if (compressedImage != null) {
            compressedSize = await compressedImage.length();
            print('MediaService: Re-compressed size (quality $currentQuality): ${compressedSize / 1024} KB');
          } else {
            break;
          }
        }

        if (compressedImage != null && compressedSize <= targetSize) {
          print('MediaService: Final compressed image size: ${compressedSize / 1024} KB (Target: <500KB)');
          return File(compressedImage.path);
        } else {
          AppNotifier.warning('Could not compress image to target size. Original size: ${originalSize / 1024} KB', title: 'Image Compression');
          return null;
        }
      } else {
        AppNotifier.error('Failed to compress image.', title: 'Image Compression');
        return null;
      }
    } catch (e) {
      print('MediaService: Error compressing image: $e');
      AppNotifier.error('Failed to compress image: ${e.toString()}', title: 'Image Compression Error');
      return null;
    }
  }
}
