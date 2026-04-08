// lib/data/models/client_interested_product.dart

class ClientInterestedProduct {
  final int clientId;
  final int productId;
  final String? productName;
  final String? productBrand;
  final String? productCategory;
  final String? productImageUrl;
  final String? productDescription;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const ClientInterestedProduct({
    required this.clientId,
    required this.productId,
    this.productName,
    this.productBrand,
    this.productCategory,
    this.productImageUrl,
    this.productDescription,
    this.isActive = false,
    this.createdAt,
    this.updatedAt,
  });

  factory ClientInterestedProduct.fromJson(Map<String, dynamic> json) {
    int _parseInt(dynamic value) {
      if (value is int) return value;
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    DateTime? _parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      if (value is String) {
        return DateTime.tryParse(value);
      }
      return null;
    }

    String? _parseString(dynamic value) {
      if (value == null) return null;
      if (value is String) return value;
      return value.toString();
    }

    final clientId = _parseInt(json['client_id']);
    final productId = _parseInt(json['products_id']);

    final name = _parseString(json['products_name']);
    final brand = _parseString(json['products_brand']);
    final category = _parseString(json['products_category']);
    final imageUrl = _parseString(json['products_image_url']);
    final description = _parseString(json['products_description']);
    final trimmedBrand = brand?.trim();
    final trimmedCategory = category?.trim();
    final trimmedImageUrl = imageUrl?.trim();
    final trimmedDescription = description?.trim();

    return ClientInterestedProduct(
      clientId: clientId,
      productId: productId,
      productName: name?.isNotEmpty == true ? name : null,
      productBrand: trimmedBrand?.isNotEmpty == true ? trimmedBrand : null,
      productCategory: trimmedCategory?.isNotEmpty == true ? trimmedCategory : null,
      productImageUrl: trimmedImageUrl?.isNotEmpty == true ? trimmedImageUrl : null,
      productDescription: trimmedDescription?.isNotEmpty == true ? trimmedDescription : null,
      isActive: _parseInt(json['products_is_active']) == 1,
      createdAt: _parseDate(json['products_created_at']),
      updatedAt: _parseDate(json['products_updated_at']),
    );
  }
}
