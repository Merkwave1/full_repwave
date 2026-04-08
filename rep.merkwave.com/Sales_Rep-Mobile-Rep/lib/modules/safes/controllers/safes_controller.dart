// lib/modules/safes/controllers/safes_controller.dart
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '../../../data/models/safe.dart';
import '../../../data/repositories/safe_repository.dart';

class SafesController extends GetxController {
  final SafeRepository _safeRepository;
  final AuthController _authController = Get.find<AuthController>();

  SafesController({required SafeRepository safeRepository}) : _safeRepository = safeRepository;

  final RxList<Safe> safes = <Safe>[].obs;
  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final RxBool isSubmittingTransfer = false.obs;
  late final bool _isStoreKeeper;
  late final bool _isCash;

  bool get isStoreKeeper => _isStoreKeeper;
  bool get isCash => _isCash;

  @override
  void onInit() {
    super.onInit();
    _isStoreKeeper = _authController.currentUser.value?.isStoreKeeper ?? false;
    _isCash = _authController.currentUser.value?.isCash ?? false;
    fetchSafes();
  }

  Future<void> fetchSafes() async {
    isLoading.value = true;
    errorMessage.value = '';

    try {
      final fetchedSafes = await _safeRepository.getSafes();
      safes.assignAll(fetchedSafes);
      print('[SafesController] Assigned ${safes.length} safes to controller');
      if (safes.isNotEmpty) print('[SafesController] Safe IDs: ${safes.map((s) => s.id).toList()}');
    } catch (e) {
      errorMessage.value = e.toString();
      print('SafesController Error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> refreshSafes() async {
    await fetchSafes();
  }

  double get totalBalance {
    if (isCash) {
      // Cash users see total of all assigned safes
      return safes.fold(0.0, (sum, safe) => sum + safe.currentBalance);
    }
    if (isStoreKeeper) {
      return storeKeeperSafes.fold(0.0, (sum, safe) => sum + safe.currentBalance);
    }
    return repSafes.fold(0.0, (sum, safe) => sum + safe.currentBalance);
  }

  /// Get all assigned safes for cash role users
  List<Safe> get assignedSafes {
    return safes.toList();
  }

  List<Safe> get repSafes {
    return safes.where((safe) => safe.type == 'rep').toList();
  }

  List<Safe> get storeKeeperSafes {
    return safes.where((safe) => safe.type == 'store_keeper').toList();
  }

  List<Safe> get mainSafes {
    return safes.where((safe) => safe.type == 'company').toList();
  }

  double get mainSafesTotalBalance {
    return mainSafes.fold(0.0, (sum, safe) => sum + safe.currentBalance);
  }

  List<Safe> get companySafes {
    // Both store keepers and representatives can see main safes for transfers
    return mainSafes;
  }

  Future<String> requestSafeTransfer({
    required int sourceSafeId,
    required int destinationSafeId,
    required double amount,
    required String amountText,
    String? notes,
    XFile? receiptImage,
  }) async {
    try {
      isSubmittingTransfer.value = true;
      final status = await _safeRepository.requestSafeTransfer(
        sourceSafeId: sourceSafeId,
        destinationSafeId: destinationSafeId,
        amount: amount,
        notes: notes,
        amountText: amountText,
        receiptImage: receiptImage,
      );
      await fetchSafes();
      return status;
    } catch (e) {
      rethrow;
    } finally {
      isSubmittingTransfer.value = false;
    }
  }
}
