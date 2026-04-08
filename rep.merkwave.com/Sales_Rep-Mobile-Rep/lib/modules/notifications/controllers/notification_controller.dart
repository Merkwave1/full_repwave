// lib/modules/notifications/controllers/notification_controller.dart
import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/services/api_service.dart';

class NotificationModel {
  final String id;
  final String? userId;
  final String? companyId;
  final String title;
  final String? body;
  final Map<String, dynamic>? data;
  final String channel;
  final String priority;
  final bool isRead;
  final DateTime? readAt;
  final DateTime? sentAt;
  final String? referenceTable;
  final String? referenceId;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    this.userId,
    this.companyId,
    required this.title,
    this.body,
    this.data,
    required this.channel,
    required this.priority,
    required this.isRead,
    this.readAt,
    this.sentAt,
    this.referenceTable,
    this.referenceId,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['notifications_id'].toString(),
      userId: json['notifications_user_id']?.toString(),
      companyId: json['notifications_company_id']?.toString(),
      title: json['notifications_title'],
      body: json['notifications_body'],
      data: json['notifications_data'] != null ? Map<String, dynamic>.from(json['notifications_data']) : null,
      channel: json['notifications_channel'] ?? 'in_app',
      priority: json['notifications_priority'] ?? 'normal',
      isRead: json['notifications_is_read'] == 1,
      readAt: json['notifications_read_at'] != null ? DateTime.parse(json['notifications_read_at']) : null,
      sentAt: json['notifications_sent_at'] != null ? DateTime.parse(json['notifications_sent_at']) : null,
      referenceTable: json['notifications_reference_table'],
      referenceId: json['notifications_reference_id']?.toString(),
      createdAt: DateTime.parse(json['notifications_created_at']),
    );
  }
}

class NotificationController extends GetxController {
  final unreadCount = 0.obs;
  final notifications = <NotificationModel>[].obs;
  final isLoading = false.obs;
  final currentPage = 1.obs;
  final hasMoreData = true.obs;
  final selectedFilter = 'all'.obs;
  final totalNotifications = 0.obs;
  late final ApiService _apiService;

  @override
  void onInit() {
    super.onInit();
    _apiService = Get.find<ApiService>();
    // Avoid showing snackbars during app bootstrap before overlay is ready
    fetchNotifications(showErrors: false);
    fetchUnreadCount();
  }

  // Show snackbar safely only when overlay/context is available
  void _showSnackbarSafe(String title, String message) {
    final ctx = Get.context;
    if (ctx != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (Get.isOverlaysOpen == false) {
          // Normal case: no overlay is currently covering the app
          Get.snackbar(title, message, snackPosition: SnackPosition.BOTTOM);
        } else {
          // If another overlay is open, just log to console to avoid crashes
          // You can also queue this if needed
          // ignore: avoid_print
          print('Deferred snackbar (overlay open): $title - $message');
        }
      });
    } else {
      // ignore: avoid_print
      print('Deferred snackbar (no context yet): $title - $message');
    }
  }

  Future<void> fetchNotifications({bool isRefresh = false, bool showErrors = true}) async {
    if (isRefresh) {
      currentPage.value = 1;
      hasMoreData.value = true;
      notifications.clear();
    }

    if (!hasMoreData.value) return;

    try {
      isLoading.value = true;

      final AuthController authController = Get.find<AuthController>();
      final userUuid = authController.currentUser.value?.uuid;

      if (userUuid == null) {
        if (showErrors) {
          _showSnackbarSafe('Error', 'User session expired. Please login again.');
        }
        return;
      }

      // Build query parameters
      final Map<String, String> queryParams = {
        'limit': '20',
        'offset': ((currentPage.value - 1) * 20).toString(),
      };

      if (selectedFilter.value == 'unread') {
        queryParams['is_read'] = '0';
      } else if (selectedFilter.value == 'read') {
        queryParams['is_read'] = '1';
      }

      final Map<String, dynamic> response = await _apiService.get(
        '/notifications/get_all.php',
        queryParameters: queryParams,
      );

      if (response['status'] == 'success') {
        final Map<String, dynamic>? payload = response['data'] is Map<String, dynamic> ? response['data'] as Map<String, dynamic> : (response['message'] is Map<String, dynamic> ? response['message'] as Map<String, dynamic> : null);

        if (payload != null) {
          final List<dynamic> items = payload['notifications'] is List ? List<dynamic>.from(payload['notifications'] as List) : const [];
          final List<NotificationModel> newNotifications = items
              .whereType<Map>()
              .map((item) => NotificationModel.fromJson(
                    item is Map<String, dynamic> ? item : Map<String, dynamic>.from(item),
                  ))
              .toList();

          if (isRefresh) {
            notifications.value = newNotifications;
          } else {
            notifications.addAll(newNotifications);
          }

          unreadCount.value = payload['unread_count'] is int ? payload['unread_count'] as int : int.tryParse(payload['unread_count']?.toString() ?? '0') ?? 0;

          totalNotifications.value = payload['total_returned'] is int ? payload['total_returned'] as int : int.tryParse(payload['total_returned']?.toString() ?? '${newNotifications.length}') ?? newNotifications.length;

          if (newNotifications.length < 20) {
            hasMoreData.value = false;
          } else {
            currentPage.value++;
          }
        }
      }
    } catch (e) {
      if (showErrors) {
        _showSnackbarSafe('Error', 'Failed to fetch notifications: $e');
      } else {
        // ignore: avoid_print
        print('Failed to fetch notifications: $e');
      }
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> fetchUnreadCount() async {
    try {
      final AuthController authController = Get.find<AuthController>();
      final userUuid = authController.currentUser.value?.uuid;

      if (userUuid == null) return;

      final Map<String, dynamic> response = await _apiService.get(
        '/notifications/get_all.php',
        queryParameters: {
          'is_read': '0',
          'limit': '1',
        },
      );

      if (response['status'] == 'success') {
        final Map<String, dynamic>? payload = response['data'] is Map<String, dynamic> ? response['data'] as Map<String, dynamic> : (response['message'] is Map<String, dynamic> ? response['message'] as Map<String, dynamic> : null);

        if (payload != null) {
          unreadCount.value = payload['unread_count'] is int ? payload['unread_count'] as int : int.tryParse(payload['unread_count']?.toString() ?? '0') ?? 0;
        }
      }
    } catch (e) {
      print('Error fetching unread count: $e');
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      final AuthController authController = Get.find<AuthController>();
      final userUuid = authController.currentUser.value?.uuid;

      if (userUuid == null) return;

      final Map<String, dynamic> response = await _apiService.post(
        '/notifications/mark_read.php',
        {
          'notification_id': notificationId,
        },
      );

      if (response['status'] == 'success') {
        // Update local state
        final index = notifications.indexWhere((n) => n.id == notificationId);
        if (index != -1) {
          final updatedNotification = NotificationModel(
            id: notifications[index].id,
            userId: notifications[index].userId,
            companyId: notifications[index].companyId,
            title: notifications[index].title,
            body: notifications[index].body,
            data: notifications[index].data,
            channel: notifications[index].channel,
            priority: notifications[index].priority,
            isRead: true,
            readAt: DateTime.now(),
            sentAt: notifications[index].sentAt,
            referenceTable: notifications[index].referenceTable,
            referenceId: notifications[index].referenceId,
            createdAt: notifications[index].createdAt,
          );
          notifications[index] = updatedNotification;
        }

        if (unreadCount.value > 0) {
          unreadCount.value--;
        }
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to mark notification as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    try {
      final AuthController authController = Get.find<AuthController>();
      final userUuid = authController.currentUser.value?.uuid;

      if (userUuid == null) return;

      final Map<String, dynamic> response = await _apiService.post(
        '/notifications/mark_read.php',
        {
          'mark_all_read': 'true',
        },
      );

      if (response['status'] == 'success') {
        // Update all unread notifications to read
        for (int i = 0; i < notifications.length; i++) {
          if (!notifications[i].isRead) {
            notifications[i] = NotificationModel(
              id: notifications[i].id,
              userId: notifications[i].userId,
              companyId: notifications[i].companyId,
              title: notifications[i].title,
              body: notifications[i].body,
              data: notifications[i].data,
              channel: notifications[i].channel,
              priority: notifications[i].priority,
              isRead: true,
              readAt: DateTime.now(),
              sentAt: notifications[i].sentAt,
              referenceTable: notifications[i].referenceTable,
              referenceId: notifications[i].referenceId,
              createdAt: notifications[i].createdAt,
            );
          }
        }

        unreadCount.value = 0;
        Get.snackbar('Success', 'All notifications marked as read!');
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to mark all notifications as read: $e');
    }
  }

  void setFilter(String filter) {
    selectedFilter.value = filter;
    fetchNotifications(isRefresh: true);
  }

  void incrementUnreadCount() {
    unreadCount.value++;
  }

  void decrementUnreadCount() {
    if (unreadCount.value > 0) {
      unreadCount.value--;
    }
  }
}
