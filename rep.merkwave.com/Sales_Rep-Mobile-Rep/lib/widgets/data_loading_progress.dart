// lib/widgets/data_loading_progress.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/services/data_cache_service.dart';

class DataLoadingProgress extends StatelessWidget {
  final bool isVisible;

  const DataLoadingProgress({
    super.key,
    this.isVisible = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!isVisible) return const SizedBox.shrink();

    final theme = Theme.of(context);

    // Check if DataCacheService is available
    if (!Get.isRegistered<DataCacheService>()) {
      return const SizedBox.shrink();
    }

    return GetBuilder<DataCacheService>(
      init: DataCacheService.instance,
      builder: (cacheService) {
        return Obx(() {
          if (!cacheService.isInitializing.value && cacheService.overallProgress.value == 0.0) {
            return const SizedBox.shrink();
          }

          return Container(
            margin: const EdgeInsets.symmetric(vertical: 16.0),
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        Icons.cloud_download_outlined,
                        color: theme.primaryColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Loading App Data',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            cacheService.currentLoadingItem.value.isNotEmpty ? cacheService.currentLoadingItem.value : 'Preparing data for offline use...',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${(cacheService.overallProgress.value * 100).toInt()}%',
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: theme.primaryColor,
                          ),
                        ),
                        Text(
                          '${cacheService.completedItems.value}/${cacheService.totalItems.value}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: cacheService.overallProgress.value,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: AlwaysStoppedAnimation<Color>(theme.primaryColor),
                      minHeight: 4,
                    ),
                  ],
                ),
              ],
            ),
          );
        });
      },
    );
  }
}
