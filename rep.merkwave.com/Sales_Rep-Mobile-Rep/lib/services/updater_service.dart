import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class UpdaterService extends GetxService {
  static const String _versionCheckUrl = 'https://your-domain.example/api/apk/version.json';

  @override
  void onReady() {
    super.onReady();
    // Check for updates automatically when the app starts
    checkForUpdate();
  }

  Future<void> checkForUpdate() async {
    if (!Platform.isAndroid) return;

    try {
      // 1. Get current app version
      final PackageInfo packageInfo = await PackageInfo.fromPlatform();
      final String currentVersion = packageInfo.version;

      // 2. Fetch version info from server
      final response = await http.get(Uri.parse(_versionCheckUrl));
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final String latestVersion = data['version'];
        final String apkUrl = data['url'];
        final String changelog = data['changelog'] ?? 'New version available';

        // 3. Compare versions
        if (_isNewVersion(currentVersion, latestVersion)) {
          _showUpdateDialog(latestVersion, changelog, apkUrl);
        }
      }
    } catch (e) {
      debugPrint('Error checking for updates: $e');
    }
  }

  bool _isNewVersion(String current, String latest) {
    List<int> currentParts = current.split('.').map(int.parse).toList();
    List<int> latestParts = latest.split('.').map(int.parse).toList();

    for (int i = 0; i < latestParts.length; i++) {
      if (i >= currentParts.length) return true;
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }
    return false;
  }

  void _showUpdateDialog(String version, String changelog, String url) {
    Get.dialog(
      AlertDialog(
        title: Text('Update Available ($version)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('A new version of the app is available.'),
            const SizedBox(height: 10),
            const Text('Changelog:', style: TextStyle(fontWeight: FontWeight.bold)),
            Text(changelog),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Later'),
          ),
          ElevatedButton(
            onPressed: () {
              Get.back();
              _launchDownloadUrl(url);
            },
            child: const Text('Update Now'),
          ),
        ],
      ),
      barrierDismissible: false,
    );
  }

  Future<void> _launchDownloadUrl(String url) async {
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      Get.snackbar(
        'Error',
        'Could not open download link',
        backgroundColor: Colors.red[100],
        colorText: Colors.red[900],
      );
    }
  }
}
