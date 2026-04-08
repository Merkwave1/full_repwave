// lib/shared_widgets/app_filter_bottom_sheet.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/shared_widgets/ultra_safe_navigation.dart';
import '/modules/clients/controllers/clients_controller.dart'; // We'll use ClientsController for now

/// A reusable bottom sheet for filtering clients.
/// This widget is tightly coupled with ClientsController for its filter logic.
/// For truly generic filters across different data types, a more abstract
/// filter controller interface would be needed.
class AppFilterBottomSheet extends GetView<ClientsController> {
  const AppFilterBottomSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      // Use SingleChildScrollView to prevent overflow
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'active_filters'.tr, // Localized
            style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Obx(() {
            // Observe changes to filter selections
            List<Widget> activeFilterChips = [];

            if (controller.selectedStatusFilter.value != null) {
              activeFilterChips.add(_buildActiveFilterChip('${'status'.tr}: ${controller.selectedStatusFilter.value!.capitalizeFirst}', () => controller.onStatusFilterChanged(null)));
            }
            // Legacy type filter removed
            if (controller.selectedAreaFilter.value != null) {
              activeFilterChips.add(_buildActiveFilterChip('${'area'.tr}: ${controller.getAreaTagName(controller.selectedAreaFilter.value)}', () => controller.onAreaFilterChanged(null)));
            }
            if (controller.selectedIndustryFilter.value != null) {
              activeFilterChips.add(_buildActiveFilterChip('${'industry'.tr}: ${controller.getIndustryName(controller.selectedIndustryFilter.value)}', () => controller.onIndustryFilterChanged(null)));
            }

            if (activeFilterChips.isEmpty) {
              return Text('no_filters_applied'.tr); // Localized
            }
            return Wrap(spacing: 8, runSpacing: 4, children: activeFilterChips);
          }),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                // Open the filter category selection bottom sheet
                Get.bottomSheet(
                  _buildFilterCategorySelectionSheet(context),
                  backgroundColor: Get.theme.canvasColor,
                  shape: const RoundedRectangleBorder(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  isScrollControlled: true,
                );
              },
              icon: const Icon(Icons.add),
              label: Text('add_filter'.tr), // Localized
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                controller.clearAllFilters(); // Clear all filters
                UltraSafeNavigation.back(context); // Close the main filter bottom sheet
              },
              child: Text('clear_all_filters'.tr), // Localized
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: ElevatedButton(
              onPressed: () {
                UltraSafeNavigation.back(context); // Close the main filter bottom sheet
                // Filters are applied reactively, so just closing is enough
              },
              child: Text('close'.tr), // Localized
            ),
          ),
        ],
      ),
    );
  }

  // Active Filter Chip for displaying applied filters
  Widget _buildActiveFilterChip(String label, VoidCallback onDelete) {
    return Chip(
      label: Text(label),
      deleteIcon: const Icon(Icons.cancel, size: 18),
      onDeleted: onDelete,
      backgroundColor: Get.theme.primaryColor.withOpacity(0.1),
      labelStyle: TextStyle(color: Get.theme.primaryColor),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }

  // Filter Category Selection Bottom Sheet
  Widget _buildFilterCategorySelectionSheet(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'select_filter_category'.tr, // Localized
            style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          ListTile(
            leading: const Icon(Icons.check_circle_outline),
            title: Text('status'.tr), // Localized
            onTap: () {
              UltraSafeNavigation.back(context); // Close category sheet
              _showStatusFilterDialog(context); // Show status filter options
            },
          ),
          // Legacy type filter removed
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: Text('area'.tr), // Localized
            onTap: () {
              UltraSafeNavigation.back(context); // Close category sheet
              _showAreaFilterDialog(context); // Show area filter options
            },
          ),
          ListTile(
            leading: const Icon(Icons.business_outlined),
            title: Text('industry'.tr), // Localized
            onTap: () {
              UltraSafeNavigation.back(context); // Close category sheet
              _showIndustryFilterDialog(context); // Show industry filter options
            },
          ),
        ],
      ),
    );
  }

  // Specific Filter Dialogs/Bottom Sheets for each category
  void _showStatusFilterDialog(BuildContext context) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'filter_by_status'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Obx(() => Wrap(
                  spacing: 10,
                  children: [
                    _buildChoiceChip('all'.tr, null, controller.selectedStatusFilter.value == null, () => controller.onStatusFilterChanged(null)),
                    _buildChoiceChip('active'.tr, 'active', controller.selectedStatusFilter.value == 'active', () => controller.onStatusFilterChanged('active')),
                    _buildChoiceChip('inactive'.tr, 'inactive', controller.selectedStatusFilter.value == 'inactive', () => controller.onStatusFilterChanged('inactive')),
                    _buildChoiceChip('prospect'.tr, 'prospect', controller.selectedStatusFilter.value == 'prospect', () => controller.onStatusFilterChanged('prospect')),
                    _buildChoiceChip('archived'.tr, 'archived', controller.selectedStatusFilter.value == 'archived', () => controller.onStatusFilterChanged('archived')),
                  ],
                )),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton(
                onPressed: () {
                  UltraSafeNavigation.back(context); // Close this specific filter dialog
                },
                child: Text('done'.tr), // Localized
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    );
  }

  // Legacy type filter removed

  void _showAreaFilterDialog(BuildContext context) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'filter_by_area'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Obx(() => DropdownButtonFormField<int?>(
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    labelText: 'select_area'.tr,
                  ),
                  value: controller.selectedAreaFilter.value,
                  items: [
                    DropdownMenuItem<int?>(
                      value: null,
                      child: Text('all'.tr),
                    ),
                    ...controller.areaTags
                        .map((area) => DropdownMenuItem<int>(
                              value: area.id,
                              child: Text(area.name),
                            ))
                        .toList(),
                  ],
                  onChanged: (value) {
                    controller.onAreaFilterChanged(value);
                  },
                )),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton(
                onPressed: () => UltraSafeNavigation.back(context),
                child: Text('done'.tr),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    );
  }

  void _showIndustryFilterDialog(BuildContext context) {
    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'filter_by_industry'.tr,
              style: Get.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Obx(() => DropdownButtonFormField<int?>(
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    labelText: 'select_industry'.tr,
                  ),
                  value: controller.selectedIndustryFilter.value,
                  items: [
                    DropdownMenuItem<int?>(
                      value: null,
                      child: Text('all'.tr),
                    ),
                    ...controller.industries
                        .map((industry) => DropdownMenuItem<int>(
                              value: industry.id,
                              child: Text(industry.name),
                            ))
                        .toList(),
                  ],
                  onChanged: (value) {
                    controller.onIndustryFilterChanged(value);
                  },
                )),
            const SizedBox(height: 20),
            Center(
              child: ElevatedButton(
                onPressed: () => UltraSafeNavigation.back(context),
                child: Text('done'.tr),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Get.theme.canvasColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
    );
  }

  // Helper for building ChoiceChips
  Widget _buildChoiceChip(String label, String? value, bool isSelected, VoidCallback onSelected) {
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: Get.theme.primaryColor.withOpacity(0.2),
      onSelected: (_) => onSelected(), // Call the provided callback
    );
  }
}
