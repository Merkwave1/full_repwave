// Clean rebuilt Clients Screen (single top section: title + search + overview)
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '/modules/clients/controllers/clients_controller.dart';
import '/core/routes/app_routes.dart';
import '/core/utils/formatting.dart';
import '/shared_widgets/loading_indicator.dart';
import '/shared_widgets/unified_card.dart';

class ClientsScreen extends GetView<ClientsController> {
  const ClientsScreen({super.key});

  static const Color _primary = Color(0xFF3F51B5);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _primary.withOpacity(0.035),
      body: Obx(() {
        if (controller.isLoading.value) {
          return LoadingIndicator(message: 'loading_clients'.tr);
        }
        return RefreshIndicator(
          onRefresh: () => controller.refreshClients(),
          color: _primary,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('clients'.tr, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: _primary)),
                        const SizedBox(height: 12),
                        _buildSearchField(),
                        const SizedBox(height: 18),
                        _buildOverview(),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
              ),
              if (controller.filteredClients.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 48),
                    child: controller.hasActiveFilters
                        ? _buildNoResultsForFilters()
                        : UnifiedEmptyState(
                            icon: Icons.people_outline,
                            title: 'no_clients_found'.tr,
                            subtitle: 'add_your_first_client_to_get_started'.tr,
                            actionText: 'add_new_client'.tr,
                            onAction: () => Get.toNamed(AppRoutes.addEditClient),
                          ),
                  ),
                )
              else ...[
                if (controller.hasActiveFilters)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                      child: _buildAppliedFiltersSection(),
                    ),
                  ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final c = controller.filteredClients[index];
                        return _buildClientCard(c);
                      },
                      childCount: controller.filteredClients.length,
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'clients_add_client_fab',
        onPressed: () => Get.toNamed(AppRoutes.addEditClient),
        icon: const Icon(Icons.add),
        label: Text('add_client'.tr),
        backgroundColor: _primary,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildSearchField() {
    return TextField(
      controller: controller.searchController,
      style: const TextStyle(color: _primary, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: 'search_clients'.tr,
        hintStyle: TextStyle(color: _primary.withOpacity(0.55), fontWeight: FontWeight.w500),
        prefixIcon: Icon(Icons.search_rounded, color: _primary.withOpacity(0.75)),
        suffixIcon: controller.searchText.value.isNotEmpty
            ? IconButton(
                icon: Icon(Icons.clear_rounded, color: _primary.withOpacity(0.7)),
                onPressed: () {
                  controller.searchController.clear();
                  controller.onSearchChanged('');
                },
              )
            : null,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: _primary.withOpacity(0.25)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: _primary.withOpacity(0.20)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: _primary.withOpacity(0.80), width: 1.6),
        ),
      ),
      onChanged: controller.onSearchChanged,
    );
  }

  Widget _buildOverview() {
    final list = controller.clients;
    final total = list.length;
    final active = list.where((e) => e.status == 'active').length;
    final inactive = list.where((e) => e.status == 'inactive').length;

    Widget statTile({required IconData icon, required String label, required String value, required Color color, List<Widget>? footer}) {
      return Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withOpacity(0.12), width: 1),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.08), blurRadius: 14, offset: const Offset(0, 6)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
                  child: Icon(icon, color: color, size: 20),
                ),
                const Spacer(),
                Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
              ],
            ),
            const SizedBox(height: 10),
            Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, letterSpacing: 0.3, color: color.withOpacity(0.8))),
            if (footer != null) ...[
              const SizedBox(height: 8),
              Wrap(spacing: 6, runSpacing: -4, children: footer),
            ]
          ],
        ),
      );
    }

    return Row(
      children: [
        Expanded(
          child: statTile(
            icon: Icons.people_rounded,
            label: 'total_clients'.tr,
            value: '$total',
            color: _primary,
            footer: [
              _miniBadge('${active} ${'active'.tr}', Colors.green),
              _miniBadge('${inactive} ${'inactive'.tr}', Colors.redAccent),
            ],
          ),
        ),
      ],
    );
  }

  Widget _miniBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.25), width: 1),
      ),
      child: Text(text, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: color)),
    );
  }

  Widget _buildNoResultsForFilters() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _primary.withOpacity(0.1), width: 1),
            boxShadow: [
              BoxShadow(color: _primary.withOpacity(0.08), blurRadius: 18, offset: const Offset(0, 8)),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: _primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(Icons.search_off_rounded, size: 48, color: _primary.withOpacity(0.6)),
              ),
              const SizedBox(height: 16),
              Text(
                'no_data_matching_filters'.tr,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _primary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'no_clients_matching_filters'.tr,
                style: TextStyle(fontSize: 14, color: _primary.withOpacity(0.6)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: controller.clearAllFilters,
                icon: const Icon(Icons.clear_all_rounded),
                label: Text('clear_filters'.tr),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildAppliedFiltersSection(),
      ],
    );
  }

  Widget _buildAppliedFiltersSection() {
    final filters = <Widget>[];

    if (controller.searchText.value.isNotEmpty) {
      filters.add(_buildFilterChip(
        'البحث: "${controller.searchText.value}"',
        onRemove: () {
          controller.searchController.clear();
          controller.onSearchChanged('');
        },
      ));
    }

    if (controller.selectedStatusFilter.value != null) {
      filters.add(_buildFilterChip(
        'الحالة: ${controller.selectedStatusFilter.value}',
        onRemove: () => controller.onStatusFilterChanged(null),
      ));
    }

    if (controller.selectedAreaFilter.value != null) {
      final areaName = controller.getAreaTagName(controller.selectedAreaFilter.value);
      filters.add(_buildFilterChip(
        'المنطقة: $areaName',
        onRemove: () => controller.onAreaFilterChanged(null),
      ));
    }

    if (controller.selectedIndustryFilter.value != null) {
      final industryName = controller.getIndustryName(controller.selectedIndustryFilter.value);
      filters.add(_buildFilterChip(
        'القطاع: $industryName',
        onRemove: () => controller.onIndustryFilterChanged(null),
      ));
    }

    if (filters.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _primary.withOpacity(0.15), width: 1),
        boxShadow: [
          BoxShadow(color: _primary.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.filter_list_rounded, size: 18, color: _primary.withOpacity(0.7)),
              const SizedBox(width: 8),
              Text(
                'applied_filters'.tr,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: _primary.withOpacity(0.8)),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: controller.clearAllFilters,
                icon: const Icon(Icons.clear_all_rounded, size: 16),
                label: Text('clear_filters'.tr, style: const TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(
                  foregroundColor: _primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: filters,
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, {required VoidCallback onRemove}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _primary.withOpacity(0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: Text(
              label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _primary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: onRemove,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(2),
              child: Icon(Icons.close_rounded, size: 16, color: _primary.withOpacity(0.7)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientCard(client) {
    // Status mapping
    Color statusColor = Colors.grey;
    IconData statusIcon = Icons.help_outline;
    final statusText = (client.status ?? 'unknown').toString().toLowerCase();
    final translatedStatus = statusText.tr;
    final statusLabel = translatedStatus == statusText ? (client.status.toString().capitalizeFirst ?? statusText) : translatedStatus;
    switch (statusText) {
      case 'active':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle_rounded;
        break;
      case 'inactive':
        statusColor = Colors.red;
        statusIcon = Icons.pause_circle_rounded;
        break;
      case 'prospect':
        statusColor = Colors.orange;
        statusIcon = Icons.hourglass_empty_rounded;
        break;
      case 'archived':
        statusColor = Colors.blueGrey;
        statusIcon = Icons.archive_rounded;
        break;
    }
    final credit = client.creditBalance;
    final hasCredit = credit > 0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _primary.withOpacity(0.06), width: 1),
        boxShadow: [
          BoxShadow(color: _primary.withOpacity(0.08), blurRadius: 18, offset: const Offset(0, 8)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => Get.toNamed(AppRoutes.clientDetail, arguments: client.id),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 16, 16),
            child: Row(
              children: [
                // Avatar / status
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: statusColor.withOpacity(0.25), width: 1.2),
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Text(
                          client.companyName.isNotEmpty ? client.companyName[0].toUpperCase() : '?',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: statusColor),
                        ),
                      ),
                      Positioned(
                        bottom: 3,
                        right: 3,
                        child: Container(
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(7),
                            boxShadow: [BoxShadow(color: statusColor.withOpacity(0.3), blurRadius: 4, offset: const Offset(0, 2))],
                          ),
                          child: Icon(statusIcon, color: statusColor, size: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 18),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              client.companyName,
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: _primary, letterSpacing: 0.2),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: statusColor.withOpacity(0.30), width: 1),
                            ),
                            child: Text(statusLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor, letterSpacing: 0.4)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (client.contactName != null && client.contactName!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            children: [
                              Icon(Icons.person_rounded, size: 15, color: _primary.withOpacity(0.55)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  client.contactName!,
                                  style: TextStyle(color: _primary.withOpacity(0.65), fontSize: 13, fontWeight: FontWeight.w600),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      Row(
                        children: [
                          if (client.contactPhone1 != null && client.contactPhone1!.isNotEmpty)
                            Expanded(
                              child: Row(
                                children: [
                                  Icon(Icons.phone_rounded, size: 15, color: _primary.withOpacity(0.55)),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      client.contactPhone1!,
                                      style: TextStyle(color: _primary.withOpacity(0.55), fontSize: 12.5),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (hasCredit)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(colors: [Colors.green.withOpacity(0.18), Colors.green.withOpacity(0.10)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.green.withOpacity(0.28), width: 1),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.account_balance_wallet_rounded, size: 14, color: Colors.green),
                                  const SizedBox(width: 4),
                                  Text(Formatting.amount(credit, decimals: 0), style: const TextStyle(color: Colors.green, fontSize: 12.5, fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_ios_rounded, size: 18, color: _primary.withOpacity(0.35)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
