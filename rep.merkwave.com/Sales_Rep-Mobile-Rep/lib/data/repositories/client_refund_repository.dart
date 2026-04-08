import 'package:get/get.dart';
import '/services/api_service.dart';
import '/data/models/client_refund.dart';

class ClientRefundRepository {
  final ApiService _api = Get.find<ApiService>();

  Future<List<ClientRefund>> getAll({
    required String userUuid,
    int? clientId,
    String? dateFrom,
    String? dateTo,
  }) async {
    final params = <String, String>{'users_uuid': userUuid};
    if (clientId != null) params['client_id'] = clientId.toString();
    if (dateFrom != null) params['date_from'] = dateFrom;
    if (dateTo != null) params['date_to'] = dateTo;

    final res = await _api.get('/client_refunds/get_all.php', queryParameters: params);
    if (res['status'] == 'success') {
      final list = (res['data'] as List?) ?? (res['client_refunds'] as List?) ?? [];
      return list.map((e) => ClientRefund.fromJson(e)).toList();
    }
    throw Exception(res['message'] ?? 'Failed to fetch client refunds');
  }
}
