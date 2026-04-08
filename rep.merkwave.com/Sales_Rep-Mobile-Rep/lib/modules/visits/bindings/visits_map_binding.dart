// lib/modules/visits/bindings/visits_map_binding.dart
import 'package:get/get.dart';
import '/modules/visits/controllers/visits_map_controller.dart';

class VisitsMapBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<VisitsMapController>(
      () => VisitsMapController(),
    );
  }
}
