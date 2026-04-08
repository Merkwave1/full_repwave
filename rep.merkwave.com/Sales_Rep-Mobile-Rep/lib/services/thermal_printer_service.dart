// lib/services/thermal_printer_service.dart
import 'package:flutter/material.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/rendering.dart';
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import 'package:get_storage/get_storage.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img;
import 'dart:typed_data';
import 'dart:ui' as ui;
import '/modules/settings/controllers/settings_controller.dart';

class ThermalPrinterService extends GetxService {
  static ThermalPrinterService get to => Get.find();

  final GetStorage _storage = GetStorage();

  // Bluetooth printing variables
  BluetoothDevice? _selectedDevice;
  bool _isConnecting = false;
  bool _isConnected = false;
  FlutterBluetoothSerial bluetooth = FlutterBluetoothSerial.instance;
  BluetoothConnection? connection;

  // Storage keys
  static const String _lastConnectedDeviceKey = 'last_connected_printer';
  static const String _lastConnectedDeviceNameKey = 'last_connected_printer_name';

  @override
  void onInit() {
    super.onInit();
    _checkBluetoothPermissions();
    _startBluetoothListener();
  }

  @override
  void onClose() {
    if (connection != null && connection!.isConnected) {
      connection?.dispose();
      connection = null;
    }
    super.onClose();
  }

  Future<void> _checkBluetoothPermissions() async {
    if (await Permission.bluetoothScan.request().isGranted && await Permission.bluetoothConnect.request().isGranted && await Permission.locationWhenInUse.request().isGranted) {
      // print("Bluetooth permissions granted.");
    } else {
      AppNotifier.error('Bluetooth permissions denied. Please enable them in app settings.');
    }
  }

  void _startBluetoothListener() {
    bluetooth.onStateChanged().listen((BluetoothState state) {
      // print('Bluetooth state changed: $state');
    });
  }

  // Get last connected device from storage
  BluetoothDevice? _getLastConnectedDevice() {
    final deviceAddress = _storage.read(_lastConnectedDeviceKey);
    final deviceName = _storage.read(_lastConnectedDeviceNameKey);

    if (deviceAddress != null) {
      return BluetoothDevice(
        name: deviceName,
        address: deviceAddress,
      );
    }
    return null;
  }

  // Save last connected device to storage
  void _saveLastConnectedDevice(BluetoothDevice device) {
    _storage.write(_lastConnectedDeviceKey, device.address);
    _storage.write(_lastConnectedDeviceNameKey, device.name ?? 'Unknown Device');
  }

  // Clear saved device
  void clearSavedDevice() {
    _storage.remove(_lastConnectedDeviceKey);
    _storage.remove(_lastConnectedDeviceNameKey);
  }

  // Main print method
  Future<bool> printWidget({
    required GlobalKey widgetKey,
    String? successMessage,
    String? errorPrefix,
  }) async {
    try {
      // Try to print with existing connection first
      if (_isConnected && connection != null && connection!.isConnected) {
        bool connectionValid = await _testConnection();
        if (connectionValid) {
          return await _printWidgetAsImage(widgetKey, successMessage);
        } else {
          // Connection lost, mark as disconnected
          _isConnected = false;
        }
      }

      // Try to reconnect to last connected device automatically
      final lastDevice = _getLastConnectedDevice();
      if (lastDevice != null) {
        AppNotifier.info('Reconnecting to last printer...');
        bool reconnected = await _reconnectToDevice(lastDevice);
        if (reconnected) {
          return await _printWidgetAsImage(widgetKey, successMessage);
        } else {
          // Clear the saved device if it failed to reconnect
          clearSavedDevice();
        }
      }

      // If no last device or reconnection failed, show device selection
      bool connected = await _selectAndConnectDevice();
      if (connected) {
        return await _printWidgetAsImage(widgetKey, successMessage);
      }

      return false;
    } catch (e) {
      AppNotifier.error('${errorPrefix ?? "Printing failed"}: ${e.toString()}', title: 'Print Error');
      return false;
    }
  }

  Future<bool> _reconnectToDevice(BluetoothDevice device) async {
    try {
      _isConnecting = true;
      _isConnected = false;

      // Close any existing connection first
      if (connection != null && connection!.isConnected) {
        await connection!.close();
      }

      // Attempt to reconnect with timeout
      connection = await BluetoothConnection.toAddress(device.address).timeout(
        const Duration(seconds: 8),
        onTimeout: () {
          throw Exception('Reconnection timed out');
        },
      );

      _isConnected = connection!.isConnected;
      _isConnecting = false;

      if (_isConnected) {
        _selectedDevice = device;
        AppNotifier.success('Reconnected to ${device.name ?? "printer"}!');
        return true;
      }
      return false;
    } catch (e) {
      _isConnecting = false;
      _isConnected = false;

      // Clean up connection
      if (connection != null) {
        try {
          await connection!.close();
        } catch (_) {}
        connection = null;
      }

      print('Reconnection failed: $e');
      return false;
    }
  }

  Future<bool> _testConnection() async {
    if (connection == null || !connection!.isConnected) {
      return false;
    }

    try {
      // Send a simple test command (initialize printer)
      connection!.output.add(Uint8List.fromList([0x1B, 0x40])); // ESC @
      await connection!.output.allSent.timeout(const Duration(seconds: 3));
      return true;
    } catch (e) {
      print('Connection test failed: $e');
      return false;
    }
  }

  Future<bool> _selectAndConnectDevice() async {
    _isConnecting = true;
    _isConnected = false;
    _selectedDevice = null;

    AppNotifier.info('Searching for Bluetooth devices...');

    try {
      // Check if Bluetooth is enabled
      bool? isEnabled = await FlutterBluetoothSerial.instance.isEnabled;
      if (isEnabled != true) {
        AppNotifier.error('Bluetooth is not enabled. Please enable Bluetooth and try again.');
        _isConnecting = false;
        return false;
      }

      // Get bonded devices
      List<BluetoothDevice> bondedDevices = await bluetooth.getBondedDevices();

      if (bondedDevices.isEmpty) {
        AppNotifier.error('No paired Bluetooth devices found. Please pair a printer in system settings.');
        _isConnecting = false;
        return false;
      }

      // Show device selection dialog
      BluetoothDevice? device = await Get.dialog<BluetoothDevice>(
        AlertDialog(
          title: const Text('Select Bluetooth Printer'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: bondedDevices.length,
              itemBuilder: (context, index) {
                BluetoothDevice dev = bondedDevices[index];
                return ListTile(
                  title: Text(dev.name ?? 'Unknown Device'),
                  subtitle: Text(dev.address),
                  leading: const Icon(Icons.print),
                  onTap: () {
                    UltraSafeNavigation.back(Get.context, dev);
                  },
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => UltraSafeNavigation.back(Get.context),
              child: const Text('Cancel'),
            ),
          ],
        ),
      );

      if (device != null) {
        _selectedDevice = device;

        AppNotifier.info('Connecting to ${device.name ?? "Unknown"} (${device.address})...');

        // Close any existing connection first
        if (connection != null && connection!.isConnected) {
          await connection!.close();
        }

        // Connect with timeout and retry logic
        connection = await BluetoothConnection.toAddress(device.address).timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            throw Exception('Connection timed out. Please make sure the printer is on and in range.');
          },
        );

        _isConnected = connection!.isConnected;
        _isConnecting = false;

        if (_isConnected) {
          _selectedDevice = device;
          _saveLastConnectedDevice(device); // Save successful connection
          AppNotifier.success('Successfully connected to ${device.name ?? "Unknown"}!');
          return true;
        } else {
          AppNotifier.error('Failed to connect to printer.');
          return false;
        }
      } else {
        AppNotifier.info('No device selected.');
        _isConnecting = false;
        return false;
      }
    } catch (e) {
      String errorMessage = 'Connection failed: ';
      if (e.toString().contains('read failed')) {
        errorMessage += 'Device disconnected or not available. Please check if the printer is on and try again.';
      } else if (e.toString().contains('timeout')) {
        errorMessage += 'Connection timed out. Please make sure the printer is on and in range.';
      } else if (e.toString().contains('socket might closed')) {
        errorMessage += 'Connection lost. Please ensure the printer is powered on and try again.';
      } else {
        errorMessage += e.toString();
      }

      AppNotifier.error(errorMessage, title: 'Connection Error');

      _isConnecting = false;
      _isConnected = false;

      // Clean up connection
      if (connection != null) {
        try {
          await connection!.close();
        } catch (_) {}
        connection = null;
      }
      return false;
    }
  }

  Future<bool> _printWidgetAsImage(GlobalKey widgetKey, String? successMessage) async {
    if (connection == null || !connection!.isConnected) {
      AppNotifier.error('Not connected to a printer.');
      return false;
    }

    AppNotifier.info('Preparing for printing...');

    try {
      // Get printer size from settings
      final SettingsController settingsController = Get.find<SettingsController>();
      final int printerSizeMm = settingsController.getPrinterSizeAsInt();

      // Determine paper size based on settings
      PaperSize paperSize;
      int imageWidth;

      switch (printerSizeMm) {
        case 58:
          paperSize = PaperSize.mm58;
          imageWidth = 384; // 58mm = ~384 dots
          break;
        case 72:
          paperSize = PaperSize.mm72;
          imageWidth = 512; // 72mm = ~512 dots
          break;
        case 80:
        default:
          paperSize = PaperSize.mm80;
          imageWidth = 576; // 80mm = ~576 dots
          break;
      }

      // Capture the widget as an image
      final imageBytes = await _captureWidgetAsImage(widgetKey, imageWidth);
      if (imageBytes == null) {
        AppNotifier.error('Failed to capture widget as image.');
        return false;
      }

      // Decode the image bytes for esc_pos_utils_plus
      img.Image? printerImage = img.decodePng(imageBytes);
      if (printerImage == null) {
        AppNotifier.error('Failed to decode image for printing.');
        return false;
      }

      // Resize image to match printer width
      printerImage = img.copyResize(printerImage, width: imageWidth);

      // Generate ESC/POS commands with selected paper size
      final profile = await CapabilityProfile.load();
      final generator = Generator(paperSize, profile);

      List<int> bytes = [];

      // Add image to bytes
      bytes += generator.image(printerImage);
      bytes += generator.feed(2); // Feed for paper cut
      bytes += generator.cut(); // Full cut command

      AppNotifier.info('Sending to printer (${printerSizeMm}mm)...');

      // Check connection before sending
      if (!connection!.isConnected) {
        throw Exception('Connection lost during printing preparation');
      }

      // Send raw bytes to printer via flutter_bluetooth_serial with timeout
      connection!.output.add(Uint8List.fromList(bytes));
      await connection!.output.allSent.timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Print operation timed out. The printer may be busy or disconnected.');
        },
      );

      AppNotifier.success(successMessage ?? 'Printed successfully on ${printerSizeMm}mm paper!');

      return true;
    } catch (e) {
      String errorMessage = 'Printing failed: ';
      if (e.toString().contains('timeout')) {
        errorMessage += 'Operation timed out. Please check if the printer is ready and try again.';
      } else if (e.toString().contains('Connection lost')) {
        errorMessage += 'Connection to printer was lost. Please reconnect and try again.';
      } else if (e.toString().contains('socket')) {
        errorMessage += 'Communication error with printer. Please check the connection.';
      } else {
        errorMessage += e.toString();
      }

      AppNotifier.error(errorMessage, title: 'Print Error');
      return false;
    } finally {
      // Always disconnect after printing (successful or failed)
      await _disconnectDevice();
    }
  }

  Future<Uint8List?> _captureWidgetAsImage(GlobalKey widgetKey, int imageWidth) async {
    try {
      RenderRepaintBoundary boundary = widgetKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
      ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        img.Image? originalImage = img.decodePng(byteData.buffer.asUint8List());
        if (originalImage != null) {
          // Convert to grayscale for thermal printers and resize to fit printer width
          img.Image grayscaleImage = img.grayscale(originalImage);
          img.Image resizedImage = img.copyResize(grayscaleImage, width: imageWidth);
          return Uint8List.fromList(img.encodePng(resizedImage));
        }
      }
    } catch (e) {
      print('Error capturing widget as image: $e');
    }
    return null;
  }

  Future<void> _disconnectDevice() async {
    try {
      if (connection != null && connection!.isConnected) {
        AppNotifier.info('Disconnecting from printer...');
        await connection!.close();
        AppNotifier.info('Disconnected successfully.');
      }
    } catch (e) {
      print('Error during disconnect: $e');
      // Don't show error to user as disconnection errors are usually not critical
    } finally {
      // Always reset state regardless of disconnect success/failure
      _isConnected = false;
      _selectedDevice = null;
      // Don't clear the saved device here so we can reconnect to it later
      connection = null;
    }
  }

  // Public method to check connection status
  bool get isConnected => _isConnected;

  // Public method to check if connecting
  bool get isConnecting => _isConnecting;

  // Public method to get current device info
  String get currentDeviceInfo {
    if (_selectedDevice != null) {
      return '${_selectedDevice!.name ?? "Unknown Device"} (${_selectedDevice!.address})';
    }
    final lastDevice = _getLastConnectedDevice();
    if (lastDevice != null) {
      return '${lastDevice.name ?? "Unknown Device"} (${lastDevice.address})';
    }
    return 'No printer selected';
  }
}
