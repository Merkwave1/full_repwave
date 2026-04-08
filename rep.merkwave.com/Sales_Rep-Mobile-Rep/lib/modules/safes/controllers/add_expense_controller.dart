// lib/modules/safes/controllers/add_expense_controller.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '/core/utils/formatting.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '../../../data/models/safe.dart';
import '../../../data/models/account.dart';
import '../../../data/repositories/safe_repository.dart';
import '../../../services/api_service.dart';
import '../../../modules/auth/controllers/auth_controller.dart';

class AddExpenseController extends GetxController {
  final SafeRepository _safeRepository;
  final ApiService _apiService;

  AddExpenseController({
    required SafeRepository safeRepository,
    required ApiService apiService,
  })  : _safeRepository = safeRepository,
        _apiService = apiService;

  final GlobalKey<FormState> formKey = GlobalKey<FormState>();
  final TextEditingController amountController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();

  final RxList<Safe> availableSafes = <Safe>[].obs;
  final RxList<Account> expenseAccounts = <Account>[].obs;
  final Rx<int?> selectedSafeId = Rx<int?>(null);
  final Rx<int?> selectedAccountId = Rx<int?>(null);
  final Rx<XFile?> selectedImage = Rx<XFile?>(null);
  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;

  final ImagePicker _picker = ImagePicker();

  @override
  void onInit() {
    super.onInit();
    loadAvailableSafes();
    loadExpenseAccounts();
  }

  @override
  void onClose() {
    amountController.dispose();
    descriptionController.dispose();
    super.onClose();
  }

  Future<void> loadAvailableSafes() async {
    try {
      isLoading.value = true;
      final safes = await _safeRepository.getSafes();
      // Show safes based on user role
      try {
        final authController = Get.find<AuthController>();
        final currentUser = authController.currentUser.value;
        if (currentUser != null) {
          if (currentUser.isCash) {
            // Cash users can use any of their assigned safes
            availableSafes.assignAll(safes);
          } else if (currentUser.isStoreKeeper) {
            availableSafes.assignAll(safes.where((safe) => safe.type == 'store_keeper'));
          } else {
            // Default to rep safes for mobile users (representatives)
            availableSafes.assignAll(safes.where((safe) => safe.type == 'rep'));
          }
        } else {
          availableSafes.assignAll(safes.where((safe) => safe.type == 'rep'));
        }
      } catch (e) {
        // If auth controller is not available for some reason, fall back to rep safes
        availableSafes.assignAll(safes.where((safe) => safe.type == 'rep'));
      }

      // Auto-select first safe if available and none selected
      if (availableSafes.isNotEmpty && selectedSafeId.value == null) {
        selectedSafeId.value = availableSafes.first.id;
      }
    } catch (e) {
      errorMessage.value = e.toString();
      Get.snackbar(
        'خطأ',
        'فشل في تحميل الخزائن: $e',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> loadExpenseAccounts() async {
    try {
      isLoading.value = true;
      
      // Get user role
      final authController = Get.find<AuthController>();
      final userRole = authController.currentUser.value?.role ?? '';
      
      // Cash role can see both مصروفات and مصروفات ادارية
      if (userRole == 'cash') {
        // Load both expense types
        final regularExpenses = await _safeRepository.getAccounts(type: 'مصروفات');
        final adminExpenses = await _safeRepository.getAccounts(type: 'مصروفات ادارية');
        expenseAccounts.assignAll([...regularExpenses, ...adminExpenses]);
      } else {
        // Reps only see regular expenses
        final accounts = await _safeRepository.getAccounts(type: 'مصروفات');
        expenseAccounts.assignAll(accounts);
      }
      
      // Auto-select first account if available and none selected
      if (expenseAccounts.isNotEmpty && selectedAccountId.value == null) {
        selectedAccountId.value = expenseAccounts.first.id;
      }
    } catch (e) {
      print('Error loading expense accounts: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> pickImageFromCamera() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.rear, // FIXED: Use back camera
        imageQuality: 80,
        maxWidth: 1080,
        maxHeight: 1080,
      );

      if (image != null) {
        selectedImage.value = image;
      }
    } catch (e) {
      Get.snackbar(
        'خطأ',
        'فشل في التقاط الصورة: $e',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  void removeImage() {
    selectedImage.value = null;
  }

  Future<void> submitExpense() async {
    if (!formKey.currentState!.validate()) {
      return;
    }

    if (selectedSafeId.value == null) {
      Get.snackbar(
        'خطأ',
        'يرجى اختيار الخزنة',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    final parsedAmount = Formatting.parseAmount(amountController.text);
    final sanitizedAmount = Formatting.sanitizeAmount(amountController.text);

    if (parsedAmount == null || parsedAmount <= 0 || sanitizedAmount.isEmpty) {
      Get.snackbar(
        'خطأ',
        'يرجى إدخال مبلغ صحيح',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    try {
      isLoading.value = true;
      errorMessage.value = '';

      final authController = Get.find<AuthController>();
      final userUuid = authController.currentUser.value?.uuid;

      if (userUuid == null) {
        throw Exception('User not authenticated');
      }

      // Prepare the expense data
      final expenseData = {
        'users_uuid': userUuid,
        'safe_id': selectedSafeId.value.toString(),
        'type': 'expense',
        'amount': sanitizedAmount,
        'description': descriptionController.text.isNotEmpty ? descriptionController.text : 'مصروف',
        'reference': 'MOBILE_EXPENSE_${DateTime.now().millisecondsSinceEpoch}',
        'account_id': selectedAccountId.value?.toString() ?? '',
      };

      // Submit the expense transaction
      Map<String, dynamic> response;

      if (selectedImage.value != null) {
        // If there's an image, use multipart request
        response = await _apiService.postMultipart(
          '/safe_transactions/add_with_receipt.php',
          expenseData.map((key, value) => MapEntry(key, value.toString())),
          filePath: selectedImage.value!.path,
          fileField: 'receipt_image',
        );
      } else {
        // If no image, use regular POST to the enhanced endpoint
        response = await _apiService.post('/safe_transactions/add_with_receipt.php', expenseData);
      }

      if (response['status'] == 'success') {
        UltraSafeNavigation.back(Get.context); // Close the screen safely

        // Check if transaction is pending approval
        final data = response['data'] as Map<String, dynamic>?;
        final isPending = data?['approval_required'] == true;

        Get.snackbar(
          'نجح',
          isPending ? 'تم إرسال المصروف للمراجعة' : 'تم إضافة المصروف بنجاح',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: isPending ? Colors.orange : Colors.green,
          colorText: Colors.white,
          duration: Duration(seconds: isPending ? 4 : 3),
        );
      } else {
        throw Exception(response['message'] ?? 'Failed to add expense');
      }
    } catch (e) {
      errorMessage.value = e.toString();
      Get.snackbar(
        'خطأ',
        'فشل في إضافة المصروف: $e',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    } finally {
      isLoading.value = false;
    }
  }
}
