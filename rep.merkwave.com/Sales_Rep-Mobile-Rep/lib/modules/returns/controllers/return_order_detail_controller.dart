// lib/modules/returns/controllers/return_order_detail_controller.dart
import 'package:get/get.dart';
import '/shared_widgets/app_notifier.dart';
import '/data/models/sales_return.dart';
import '/data/repositories/sales_return_repository.dart';
import '/modules/returns/controllers/returns_controller.dart'; // For refreshing list

class ReturnOrderDetailController extends GetxController {
  final SalesReturnRepository _salesReturnRepository;

  ReturnOrderDetailController({required SalesReturnRepository salesReturnRepository}) : _salesReturnRepository = salesReturnRepository;

  final Rx<SalesReturn?> salesReturn = Rx<SalesReturn?>(null);
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;
  final RxBool isUpdatingStatus = false.obs;

  int? returnId;

  @override
  void onInit() {
    super.onInit();
    try {
      if (Get.arguments != null && Get.arguments is int) {
        returnId = Get.arguments as int;
        fetchReturnDetail(returnId!);
      } else {
        errorMessage.value = 'Return ID not provided for details screen. Please navigate with an ID.';
        isLoading.value = false;
        print('ReturnOrderDetailController Error: ${errorMessage.value}');
        AppNotifier.error('Return ID is missing for details screen.');
      }
    } catch (e, stack) {
      errorMessage.value = 'Initialization Error: ${e.toString()}';
      print('ReturnOrderDetailController Init Error: ${errorMessage.value}');
      print('Stack trace: $stack');
      AppNotifier.error('An unexpected error occurred during initialization.');
      isLoading.value = false;
    }
  }

  Future<void> fetchReturnDetail(int id) async {
    try {
      isLoading.value = true;
      errorMessage.value = '';
      final fetchedReturn = await _salesReturnRepository.getSalesReturnById(id);
      salesReturn.value = fetchedReturn;
    } catch (e, stack) {
      errorMessage.value = 'Failed to load return details: ${e.toString()}';
      print('ReturnOrderDetailController Fetch Error: ${errorMessage.value}');
      print('Stack trace: $stack');
      AppNotifier.error('Failed to load return details. Please try again.');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> updateReturnStatus(String newStatus) async {
    if (salesReturn.value == null || isUpdatingStatus.value) return;

    isUpdatingStatus.value = true;
    errorMessage.value = '';

    try {
      final availableOptions = getAvailableStatusOptions();
      if (!availableOptions.contains(newStatus)) {
        AppNotifier.error('Status change to ${_localizedStatus(newStatus)} is not allowed.');
        return;
      }

      final updatedReturn = salesReturn.value!.copyWith(status: newStatus);
      await _salesReturnRepository.updateSalesReturn(updatedReturn);
      salesReturn.value = updatedReturn;
      AppNotifier.success('Sales return status updated to ${_localizedStatus(newStatus)}.');

      // Refresh the list on the previous screen
      if (Get.isRegistered<ReturnsController>()) {
        final returnsController = Get.find<ReturnsController>();
        returnsController.markNeedsRefresh();
      }
    } catch (e, stack) {
      errorMessage.value = 'Failed to update status: ${e.toString()}';
      print('ReturnOrderDetailController Status Update Error: ${errorMessage.value}');
      print('Stack trace: $stack');
      AppNotifier.error('Failed to update sales return status. Please try again.');
    } finally {
      isUpdatingStatus.value = false;
    }
  }

  List<String> getAvailableStatusOptions() {
    final currentStatus = salesReturn.value?.status;
    if (currentStatus == null) {
      return [];
    }

    switch (currentStatus.toLowerCase()) {
      case 'draft':
        return ['Draft', 'Pending', 'Cancelled'];
      case 'pending':
        return ['Pending', 'Cancelled'];
      case 'approved':
        return ['Approved', 'Processed', 'Cancelled'];
      case 'processed':
      case 'cancelled':
      case 'rejected':
        return [currentStatus];
      default:
        return [currentStatus];
    }
  }

  String _localizedStatus(String status) {
    final key = status.toLowerCase();
    final translated = key.tr;
    return translated == key ? status : translated;
  }
}
