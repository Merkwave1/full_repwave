// lib/data/models/warehouse.dart
import 'dart:convert';

class Warehouse {
  final int warehouseId;
  final String warehouseName;
  final String warehouseType;
  final String? warehouseCode;
  final String? warehouseAddress;
  final String? warehouseContactPerson;
  final String? warehousePhone;
  final String? warehouseStatus;
  final int? warehouseRepresentativeUserId;

  Warehouse({
    required this.warehouseId,
    required this.warehouseName,
    required this.warehouseType,
    this.warehouseCode,
    this.warehouseAddress,
    this.warehouseContactPerson,
    this.warehousePhone,
    this.warehouseStatus,
    this.warehouseRepresentativeUserId,
  });

  factory Warehouse.fromJson(Map<String, dynamic> json) => Warehouse(
        warehouseId: json["warehouse_id"],
        warehouseName: json["warehouse_name"],
        warehouseType: json["warehouse_type"],
        warehouseCode: json["warehouse_code"],
        warehouseAddress: json["warehouse_address"],
        warehouseContactPerson: json["warehouse_contact_person"],
        warehousePhone: json["warehouse_phone"],
        warehouseStatus: json["warehouse_status"],
        warehouseRepresentativeUserId: json["warehouse_representative_user_id"],
      );

  Map<String, dynamic> toJson() => {
        "warehouse_id": warehouseId,
        "warehouse_name": warehouseName,
        "warehouse_type": warehouseType,
        "warehouse_code": warehouseCode,
        "warehouse_address": warehouseAddress,
        "warehouse_contact_person": warehouseContactPerson,
        "warehouse_phone": warehousePhone,
        "warehouse_status": warehouseStatus,
        "warehouse_representative_user_id": warehouseRepresentativeUserId,
      };
}
