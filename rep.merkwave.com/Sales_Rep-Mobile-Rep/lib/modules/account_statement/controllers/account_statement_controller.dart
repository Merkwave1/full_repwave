import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

// Using unified backend API instead of per-entity repositories
import '/core/utils/formatting.dart';
import '/modules/auth/controllers/auth_controller.dart';
import '/services/api_service.dart';

const int _pdfRowHardLimit = 5000;
const int _pdfMaxPagesUpperBound = 4000;

/// Controller to load a unified Account Statement for a client (orders, returns, payments, refunds later)
class AccountStatementController extends GetxController {
  final AuthController _auth = Get.find<AuthController>();
  final ApiService _api = Get.find<ApiService>();

  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;
  final RxInt clientId = RxInt(0);
  final RxString clientName = ''.obs;
  final Rx<DateTime?> dateFrom = Rx<DateTime?>(null);
  final Rx<DateTime?> dateTo = Rx<DateTime?>(null);

  // Server-backed unified rows
  final RxList<_Row> statementRows = <_Row>[].obs;
  final RxBool isGeneratingPdf = false.obs;
  final RxDouble pdfProgress = 0.0.obs;
  final RxString pdfProgressMessage = ''.obs;

  // Unified row for rendering and PDF
  Iterable<_Row> get unifiedSortedRows {
    // Apply client-side date filter on server-provided rows (also sent to server)
    final df = dateFrom.value;
    final dt = dateTo.value;
    final filtered = statementRows.where((row) {
      if (row.date == null) return true;
      if (df != null && row.date!.isBefore(DateTime(df.year, df.month, df.day))) return false;
      if (dt != null && row.date!.isAfter(DateTime(dt.year, dt.month, dt.day, 23, 59, 59))) return false;
      return true;
    }).toList();

    // Sort by date ascending (for stable calculations)
    filtered.sort((a, b) {
      final ad = a.date?.millisecondsSinceEpoch ?? 0;
      final bd = b.date?.millisecondsSinceEpoch ?? 0;
      return ad.compareTo(bd);
    });

    return filtered;
  }

  double get totalDebit => unifiedSortedRows.where((r) => r.amount > 0).fold(0.0, (s, r) => s + r.amount);
  double get totalCredit => unifiedSortedRows.where((r) => r.amount < 0).fold(0.0, (s, r) => s + (-r.amount));
  double get closingBalance => rowsWithBalanceDesc.isNotEmpty ? rowsWithBalanceDesc.last.balance : 0.0;

  // Oldest to newest with running balance for each row (ASCENDING ORDER)
  List<_RowWithBalance> get rowsWithBalanceDesc {
    final asc = unifiedSortedRows.toList();
    double running = 0.0;
    final List<_RowWithBalance> ascWithBal = [];
    for (final r in asc) {
      final value = r.amountForCalc ?? r.amount;
      running += value;
      ascWithBal.add(_RowWithBalance(row: r, balance: running));
    }
    // Return in ascending order (old to new) - NO REVERSE
    return ascWithBal;
  }

  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args is Map && args['id'] != null) {
      clientId.value = args['id'] as int;
      final name = args['name'];
      if (name is String && name.trim().isNotEmpty) {
        clientName.value = name;
      }
    } else if (args is int) {
      clientId.value = args;
    }
    loadStatement();
  }

  Future<void> loadStatement() async {
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final uid = _auth.currentUser.value?.uuid;
      if (uid == null) {
        throw Exception('No user logged in');
      }
      // Build query params
      final qp = <String, String>{
        'users_uuid': uid,
        'client_id': clientId.value.toString(),
      };
      if (dateFrom.value != null) {
        qp['date_from'] = _fmtDate(dateFrom.value!);
      }
      if (dateTo.value != null) {
        qp['date_to'] = _fmtDate(dateTo.value!);
      }

      // Call unified backend API
      final resp = await _api.get('/reports/client_account_statement.php', queryParameters: qp);
      if ((resp['status']?.toString().toLowerCase() ?? '') != 'success') {
        throw Exception(resp['message'] ?? 'Failed to load account statement');
      }
      final data = resp['data'] as Map<String, dynamic>?;
      if (data == null) {
        throw Exception('Invalid response: missing data');
      }

      // Update client name from server if empty
      final serverClientName = (data['client_name'] ?? '').toString();
      if (clientName.value.trim().isEmpty && serverClientName.isNotEmpty) {
        clientName.value = serverClientName;
      }

      // Parse entries
      final List<dynamic> entries = (data['entries'] as List?) ?? const [];
      final parsed = entries.map<_Row>((e) {
        final m = e as Map<String, dynamic>;
        final String type = (m['type'] ?? '').toString();
        final int id = int.tryParse((m['id'] ?? '0').toString()) ?? 0;
        final String? dateStr = m['date']?.toString();
        DateTime? parsedDate;
        if (dateStr != null && dateStr.isNotEmpty) {
          try {
            parsedDate = DateTime.tryParse(dateStr);
          } catch (_) {
            parsedDate = null;
          }
        }
        final String? status = m['status']?.toString();
        double amountSigned = double.tryParse((m['amount_signed'] ?? m['debit'] ?? m['credit'] ?? '0').toString()) ?? 0.0;
        double amountForCalc;
        switch (type) {
          case 'order':
            amountSigned = amountSigned.abs();
            amountForCalc = -amountSigned; // debit decreases balance
            break;
          case 'return':
            amountSigned = -amountSigned.abs();
            amountForCalc = -amountSigned; // credit increases balance
            break;
          case 'payment':
            amountSigned = -amountSigned.abs();
            amountForCalc = -amountSigned; // credit increases balance
            break;
          case 'refund':
            amountSigned = amountSigned.abs();
            amountForCalc = -amountSigned; // debit decreases balance
            break;
          default:
            amountForCalc = amountSigned;
        }
        return _Row(
          type: type,
          id: id,
          date: parsedDate,
          status: status,
          amount: amountSigned, // debit positive, credit negative (normalized for UI)
          amountForCalc: amountForCalc,
        );
      }).toList();

      statementRows.assignAll(parsed);
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  void setDateFrom(DateTime? value) {
    dateFrom.value = value;
  }

  void setDateTo(DateTime? value) {
    dateTo.value = value;
  }

  Future<void> shareAsPdf({String? clientName}) async {
    if (isGeneratingPdf.value) {
      return;
    }

    final rows = rowsWithBalanceDesc;
    if (rows.isEmpty) {
      Get.snackbar('share_pdf'.tr, 'no_account_statement_rows'.tr);
      return;
    }

    final totalRowsCount = rows.length;
    if (totalRowsCount > _pdfRowHardLimit) {
      final message = 'account_statement_pdf_too_many_rows'.trParams({'rows': totalRowsCount.toString()});
      Get.snackbar('error'.tr, message);
      return;
    }

    isGeneratingPdf.value = true;
    pdfProgress.value = 0.0;
    pdfProgressMessage.value = 'loading'.tr;
    Get.dialog(
      Obx(
        () => Dialog(
          backgroundColor: Get.theme.colorScheme.surface,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(
                  value: pdfProgress.value > 0.0 && pdfProgress.value < 0.99 ? pdfProgress.value : null,
                ),
                const SizedBox(height: 16),
                Text(
                  pdfProgressMessage.value.isEmpty ? 'loading'.tr : pdfProgressMessage.value,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
      barrierDismissible: false,
      useSafeArea: false,
    );

    await Future.delayed(const Duration(milliseconds: 80));

    try {
      final isRtl = Get.locale?.languageCode == 'ar' || Get.locale?.languageCode == 'ar-SA';
      final accountStatementLabel = 'account_statement'.tr;
      final printDateLabel = 'print_date'.tr;
      final typeLabel = 'statement_col_type'.tr;
      final idLabel = 'statement_col_reference'.tr;
      final dateLabel = 'statement_col_date'.tr;
      final statusLabel = 'statement_col_status'.tr;
      final debitLabel = 'debit'.tr;
      final creditLabel = 'credit'.tr;
      final balanceLabel = 'balance'.tr;
      final netLabel = 'net'.tr;
      final periodLabel = 'statement_period'.tr;
      final fromToText = 'statement_period_from_to'.trParams({
        'from': dateFrom.value != null ? _fmtDate(dateFrom.value!) : '—',
        'to': dateTo.value != null ? _fmtDate(dateTo.value!) : '—',
      });

      final fontBytes = (await rootBundle.load('assets/fonts/Cairo-Regular.ttf')).buffer.asUint8List();
      final safeName = _resolveClientNameForHeader(clientName);
      final rowsPayload = rows.map((row) {
        final debitText = row.row.amount > 0 ? row.row.amount.toStringAsFixed(2) : '';
        final creditText = row.row.amount < 0 ? (-row.row.amount).toStringAsFixed(2) : '';
        return {
          'type': _typeLabel(row.row.type),
          'id': '#${row.row.id}',
          'date': row.row.date?.toLocal().toString().split('.')[0] ?? '-',
          'status': row.row.status ?? '',
          'debit': debitText,
          'credit': creditText,
          'balance': row.balance.toStringAsFixed(2),
        };
      }).toList();

      final progressChunk = _resolveProgressChunkSize(totalRowsCount);
      final rowsPerPageHint = _resolveRowsPerPageHint(totalRowsCount);
      final tableChunkSize = _resolveTableChunkSize(totalRowsCount);
      final maxPages = _resolveMaxPages(totalRowsCount);

      final payload = <String, dynamic>{
        'isRtl': isRtl,
        'title': '$accountStatementLabel ($safeName)',
        'printDateLine': '$printDateLabel: ${DateTime.now().toLocal().toString().split('.')[0]}',
        'periodLine': (dateFrom.value != null || dateTo.value != null) ? '$periodLabel: $fromToText' : null,
        'headers': {
          'type': typeLabel,
          'id': idLabel,
          'date': dateLabel,
          'status': statusLabel,
          'debit': debitLabel,
          'credit': creditLabel,
          'balance': balanceLabel,
        },
        'fontData': fontBytes,
        'rows': rowsPayload,
        'summary': {
          'debit': '$debitLabel: ${Formatting.amount(totalDebit)}',
          'credit': '$creditLabel: ${Formatting.amount(totalCredit)}',
          'net': '$netLabel: ${Formatting.amount(closingBalance)}',
        },
        'progressChunk': progressChunk,
        'rowCount': totalRowsCount,
        'rowsPerPageHint': rowsPerPageHint,
        'tableChunkSize': tableChunkSize,
        'maxPages': maxPages,
      };
      pdfProgressMessage.value = '${'loading'.tr} (${totalRowsCount.toString()})';

      final bytes = await _generateAccountStatementPdfWithProgress(
        payload,
        onStage: (stage) {
          switch (stage) {
            case 'start':
              pdfProgress.value = 0.05;
              pdfProgressMessage.value = 'loading'.tr;
              break;
            case 'render':
              pdfProgressMessage.value = '${'loading'.tr}: ${'share_pdf'.tr}';
              pdfProgress.value = pdfProgress.value.clamp(0.05, 0.35);
              break;
            case 'layout':
              pdfProgressMessage.value = '${'loading'.tr}: ${'account_statement'.tr}';
              pdfProgress.value = pdfProgress.value.clamp(0.35, 0.6);
              break;
            case 'save':
              pdfProgressMessage.value = '${'loading'.tr}: ${'share_pdf'.tr}';
              pdfProgress.value = pdfProgress.value.clamp(0.6, 0.85);
              break;
            default:
              break;
          }
        },
        onProgress: (processed, total) {
          if (total > 0) {
            final progress = processed / total;
            final percentage = (progress * 100).clamp(0, 100).toStringAsFixed(0);
            pdfProgress.value = 0.1 + (progress * 0.75);
            pdfProgressMessage.value = '${'loading'.tr} $processed / $total ($percentage%)';
          }
        },
      ).timeout(const Duration(minutes: 2));

      final tempDir = await getTemporaryDirectory();
      final fileName = 'account_statement_${safeName.isNotEmpty ? safeName.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_') : clientId.value}.pdf';
      final filePath = '${tempDir.path}/$fileName';
      final file = File(filePath);
      await file.writeAsBytes(bytes);

      pdfProgress.value = 0.95;
      pdfProgressMessage.value = '${'share_pdf'.tr}…';

      if (Get.isDialogOpen == true) {
        Get.back();
      }

      await Printing.sharePdf(bytes: bytes, filename: fileName);
      Get.snackbar('share_pdf'.tr, 'account_statement_pdf_ready'.tr);
    } on PdfTooManyPagesException catch (e) {
      final message = 'account_statement_pdf_too_many_pages'.trParams({
        'pages': e.maxPages.toString(),
        'rows': e.totalRows.toString(),
      });
      Get.snackbar('error'.tr, message);
    } catch (e) {
      Get.snackbar('error'.tr, 'account_statement_pdf_error'.trParams({'error': e.toString()}));
    } finally {
      if (Get.isDialogOpen == true) {
        Get.back();
      }
      pdfProgress.value = 0.0;
      pdfProgressMessage.value = '';
      isGeneratingPdf.value = false;
    }
  }
}

Future<Uint8List> _generateAccountStatementPdfWithProgress(
  Map<String, dynamic> payload, {
  required void Function(String stage) onStage,
  required void Function(int processed, int total) onProgress,
}) async {
  final receivePort = ReceivePort();
  final errorPort = ReceivePort();
  final exitPort = ReceivePort();

  final isolate = await Isolate.spawn(
    _accountStatementPdfIsolateEntry,
    {
      'sendPort': receivePort.sendPort,
      'payload': payload,
    },
    onError: errorPort.sendPort,
    onExit: exitPort.sendPort,
  );

  final completer = Completer<Uint8List>();
  final subscription = receivePort.listen((dynamic message) {
    if (message is Map) {
      final type = message['type'];
      switch (type) {
        case 'stage':
          onStage(message['stage']?.toString() ?? '');
          break;
        case 'progress':
          final processed = message['processed'] as int? ?? 0;
          final total = message['total'] as int? ?? 0;
          onProgress(processed, total);
          break;
        case 'result':
          final data = message['bytes'];
          if (!completer.isCompleted) {
            if (data is TransferableTypedData) {
              completer.complete(data.materialize().asUint8List());
            } else if (data is Uint8List) {
              completer.complete(data);
            } else {
              completer.completeError(Exception('Unexpected PDF response type: ${data.runtimeType}'));
            }
          }
          break;
        case 'error':
          if (!completer.isCompleted) {
            final code = message['code']?.toString();
            if (code == 'too_many_pages') {
              completer.completeError(
                PdfTooManyPagesException(
                  totalRows: message['rows'] as int? ?? 0,
                  maxPages: message['maxPages'] as int? ?? 0,
                  estimatedPages: message['estimatedPages'] as int? ?? 0,
                  rowsPerPageHint: message['rowsPerPageHint'] as int? ?? 0,
                ),
              );
            } else {
              completer.completeError(Exception(message['error']?.toString() ?? 'Unknown PDF error'));
            }
          }
          break;
      }
    }
  });

  final errorSubscription = errorPort.listen((dynamic message) {
    if (!completer.isCompleted) {
      if (message is List && message.length >= 2) {
        completer.completeError(Exception(message.first?.toString() ?? 'Isolate error'));
      } else {
        completer.completeError(Exception(message.toString()));
      }
    }
  });

  final exitSubscription = exitPort.listen((_) {});

  try {
    final bytes = await completer.future;
    return bytes;
  } finally {
    await subscription.cancel();
    await errorSubscription.cancel();
    await exitSubscription.cancel();
    receivePort.close();
    errorPort.close();
    exitPort.close();
    isolate.kill(priority: Isolate.immediate);
  }
}

void _accountStatementPdfIsolateEntry(Map<String, dynamic> message) async {
  final sendPort = message['sendPort'] as SendPort;
  final payload = (message['payload'] as Map).map(
    (key, value) => MapEntry(key.toString(), value),
  );

  try {
    sendPort.send({'type': 'stage', 'stage': 'start'});
    final bytes = await _generateAccountStatementPdf(payload, progressPort: sendPort);
    sendPort.send({
      'type': 'result',
      'bytes': TransferableTypedData.fromList([bytes]),
    });
  } catch (e, stack) {
    if (e is PdfTooManyPagesException) {
      sendPort.send({
        'type': 'error',
        'code': 'too_many_pages',
        'error': e.toString(),
        'maxPages': e.maxPages,
        'rows': e.totalRows,
        'estimatedPages': e.estimatedPages,
        'rowsPerPageHint': e.rowsPerPageHint,
      });
    } else {
      sendPort.send({
        'type': 'error',
        'error': e.toString(),
        'stack': stack.toString(),
      });
    }
  }
}

Future<Uint8List> _generateAccountStatementPdf(
  Map<String, dynamic> payload, {
  SendPort? progressPort,
}) async {
  final fontBytes = payload['fontData'] as Uint8List;
  final baseFont = pw.Font.ttf(ByteData.view(fontBytes.buffer));
  final theme = pw.ThemeData.withFont(
    base: baseFont,
    bold: baseFont,
  );

  final bool isRtl = payload['isRtl'] == true;
  final pw.TextDirection defaultDirection = isRtl ? pw.TextDirection.rtl : pw.TextDirection.ltr;
  final Map<String, String> headers = (payload['headers'] as Map).map((key, value) => MapEntry(key.toString(), value?.toString() ?? ''));
  final Map<String, String> summary = (payload['summary'] as Map).map((key, value) => MapEntry(key.toString(), value?.toString() ?? ''));

  final rows = (payload['rows'] as List).map<Map<String, String>>((row) => (row as Map).map((key, value) => MapEntry(key.toString(), value?.toString() ?? ''))).toList();

  final totalRows = rows.length;
  final chunkSizeRaw = payload['progressChunk'] as int?;
  final chunkSize = (chunkSizeRaw == null || chunkSizeRaw <= 0) ? 25 : chunkSizeRaw;
  var processed = 0;

  void reportStage(String stage) {
    progressPort?.send({'type': 'stage', 'stage': stage});
  }

  void reportProgress() {
    if (progressPort != null && (processed % chunkSize == 0 || processed == totalRows)) {
      progressPort.send({
        'type': 'progress',
        'processed': processed,
        'total': totalRows,
      });
    }
  }

  reportStage('render');

  final List<List<String>> dataRows = [];
  for (final row in rows) {
    final current = isRtl
        ? [
            row['balance'] ?? '',
            row['credit'] ?? '',
            row['debit'] ?? '',
            row['status'] ?? '',
            row['date'] ?? '-',
            row['id'] ?? '',
            row['type'] ?? '',
          ]
        : [
            row['type'] ?? '',
            row['id'] ?? '',
            row['date'] ?? '-',
            row['status'] ?? '',
            row['debit'] ?? '',
            row['credit'] ?? '',
            row['balance'] ?? '',
          ];
    dataRows.add(current);
    processed++;
    reportProgress();
  }

  reportStage('layout');

  final headersList = isRtl
      ? [
          headers['balance'] ?? '',
          headers['credit'] ?? '',
          headers['debit'] ?? '',
          headers['status'] ?? '',
          headers['date'] ?? '',
          headers['id'] ?? '',
          headers['type'] ?? '',
        ]
      : [
          headers['type'] ?? '',
          headers['id'] ?? '',
          headers['date'] ?? '',
          headers['status'] ?? '',
          headers['debit'] ?? '',
          headers['credit'] ?? '',
          headers['balance'] ?? '',
        ];

  final Map<int, pw.Alignment> headerAlignments;
  final Map<int, pw.Alignment> cellAlignments;

  if (isRtl) {
    headerAlignments = {
      0: pw.Alignment.centerRight,
      1: pw.Alignment.centerRight,
      2: pw.Alignment.centerRight,
      3: pw.Alignment.center,
      4: pw.Alignment.center,
      5: pw.Alignment.center,
      6: pw.Alignment.centerRight,
    };
    cellAlignments = Map<int, pw.Alignment>.from(headerAlignments);
  } else {
    headerAlignments = {
      0: pw.Alignment.centerLeft,
      1: pw.Alignment.center,
      2: pw.Alignment.center,
      3: pw.Alignment.center,
      4: pw.Alignment.centerRight,
      5: pw.Alignment.centerRight,
      6: pw.Alignment.centerRight,
    };
    cellAlignments = Map<int, pw.Alignment>.from(headerAlignments);
  }

  final columnWidths = <int, pw.TableColumnWidth>{
    0: const pw.FlexColumnWidth(1.6),
    1: const pw.FlexColumnWidth(1.4),
    2: const pw.FlexColumnWidth(1.4),
    3: const pw.FlexColumnWidth(1.4),
    4: const pw.FlexColumnWidth(1.6),
    5: const pw.FlexColumnWidth(1.2),
    6: const pw.FlexColumnWidth(1.8),
  };

  final dynamic maxPagesPayload = payload['maxPages'];
  final int? requestedMaxPages = maxPagesPayload is int ? maxPagesPayload : null;
  final int rowsPerPageHintPayload = payload['rowsPerPageHint'] is int ? payload['rowsPerPageHint'] as int : 0;
  final int rowsPerPageHint = rowsPerPageHintPayload > 0 ? rowsPerPageHintPayload : _resolveRowsPerPageHint(totalRows);
  final int estimatedPages = totalRows > 0 ? (totalRows / rowsPerPageHint).ceil() : 1;

  int resolvedMaxPages = (requestedMaxPages != null && requestedMaxPages > 0) ? requestedMaxPages : _resolveMaxPages(totalRows);
  if (resolvedMaxPages < estimatedPages + 30) {
    resolvedMaxPages = estimatedPages + 30;
  }
  if (resolvedMaxPages < 150) {
    resolvedMaxPages = 150;
  }
  if (resolvedMaxPages > _pdfMaxPagesUpperBound) {
    resolvedMaxPages = _pdfMaxPagesUpperBound;
  }

  final doc = pw.Document();
  try {
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        theme: theme,
        maxPages: resolvedMaxPages,
        build: (ctx) {
          final widgets = <pw.Widget>[];

          // Header section
          widgets.add(
            pw.Directionality(
              textDirection: defaultDirection,
              child: pw.Column(
                crossAxisAlignment: isRtl ? pw.CrossAxisAlignment.end : pw.CrossAxisAlignment.start,
                children: [
                  pw.Header(
                    level: 0,
                    child: pw.Text(
                      payload['title']?.toString() ?? '',
                      textDirection: defaultDirection,
                    ),
                  ),
                  pw.Text(
                    payload['printDateLine']?.toString() ?? '',
                    textDirection: defaultDirection,
                  ),
                  if ((payload['periodLine']?.toString().isNotEmpty ?? false))
                    pw.Padding(
                      padding: const pw.EdgeInsets.only(top: 4, bottom: 8),
                      child: pw.Text(
                        payload['periodLine']?.toString() ?? '',
                        textDirection: defaultDirection,
                      ),
                    ),
                  pw.SizedBox(height: 8),
                ],
              ),
            ),
          );

          // Build table manually row by row to avoid large batch rendering
          widgets.add(
            pw.Directionality(
              textDirection: defaultDirection,
              child: pw.Table(
                border: pw.TableBorder.all(),
                columnWidths: columnWidths,
                children: [
                  // Header row
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey300),
                    children: headersList.map((header) {
                      return pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Text(
                          header,
                          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                          textAlign: pw.TextAlign.center,
                          textDirection: defaultDirection,
                        ),
                      );
                    }).toList(),
                  ),
                  // Data rows
                  ...dataRows.map((row) {
                    return pw.TableRow(
                      children: row.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final cellText = entry.value;
                        final alignment = cellAlignments[idx] ?? pw.Alignment.center;
                        pw.TextAlign textAlign;
                        if (alignment == pw.Alignment.centerLeft) {
                          textAlign = pw.TextAlign.left;
                        } else if (alignment == pw.Alignment.centerRight) {
                          textAlign = pw.TextAlign.right;
                        } else {
                          textAlign = pw.TextAlign.center;
                        }
                        return pw.Padding(
                          padding: const pw.EdgeInsets.all(4),
                          child: pw.Text(
                            cellText,
                            style: const pw.TextStyle(fontSize: 9),
                            textAlign: textAlign,
                            textDirection: defaultDirection,
                          ),
                        );
                      }).toList(),
                    );
                  }),
                ],
              ),
            ),
          );

          // Summary section
          widgets.add(
            pw.Directionality(
              textDirection: defaultDirection,
              child: pw.Column(
                crossAxisAlignment: isRtl ? pw.CrossAxisAlignment.end : pw.CrossAxisAlignment.start,
                children: [
                  pw.SizedBox(height: 8),
                  pw.Align(
                    alignment: isRtl ? pw.Alignment.centerLeft : pw.Alignment.centerRight,
                    child: pw.Row(
                      mainAxisSize: pw.MainAxisSize.min,
                      children: [
                        pw.Text(summary['debit'] ?? '', textDirection: defaultDirection),
                        pw.SizedBox(width: 12),
                        pw.Text(summary['credit'] ?? '', textDirection: defaultDirection),
                        pw.SizedBox(width: 12),
                        pw.Text(summary['net'] ?? '', textDirection: defaultDirection),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );

          return widgets;
        },
      ),
    );
  } on pw.TooManyPagesException {
    throw PdfTooManyPagesException(
      totalRows: totalRows,
      maxPages: resolvedMaxPages,
      estimatedPages: estimatedPages,
      rowsPerPageHint: rowsPerPageHint,
    );
  }

  reportStage('save');
  try {
    final bytes = await doc.save();
    reportStage('done');
    return bytes;
  } on pw.TooManyPagesException {
    throw PdfTooManyPagesException(
      totalRows: totalRows,
      maxPages: resolvedMaxPages,
      estimatedPages: estimatedPages,
      rowsPerPageHint: rowsPerPageHint,
    );
  }
}

String _typeLabel(String type) {
  switch (type) {
    case 'order':
      return 'statement_type_order'.tr;
    case 'return':
      return 'statement_type_return'.tr;
    case 'payment':
      return 'statement_type_payment'.tr;
    case 'refund':
      return 'statement_type_refund'.tr;
    default:
      return type.capitalizeFirst ?? type;
  }
}

int _resolveProgressChunkSize(int totalRows) {
  if (totalRows <= 0) {
    return 1;
  }

  final chunk = (totalRows / 200).ceil();
  if (chunk < 1) {
    return 1;
  }
  if (chunk > 50) {
    return 50;
  }
  return chunk;
}

int _resolveRowsPerPageHint(int totalRows) {
  if (totalRows > 3000) {
    return 8;
  }
  if (totalRows > 2000) {
    return 9;
  }
  if (totalRows > 1200) {
    return 10;
  }
  if (totalRows > 800) {
    return 11;
  }
  return 12;
}

int _resolveTableChunkSize(int totalRows) {
  if (totalRows > 2500) {
    return 120;
  }
  if (totalRows > 1500) {
    return 140;
  }
  if (totalRows > 800) {
    return 160;
  }
  return 200;
}

int _resolveMaxPages(int totalRows) {
  if (totalRows <= 0) {
    return 150;
  }

  final rowsPerPageHint = _resolveRowsPerPageHint(totalRows);
  int estimatedPages = (totalRows / rowsPerPageHint).ceil();
  if (estimatedPages < 1) {
    estimatedPages = 1;
  }

  int candidate = estimatedPages + 120;
  if (candidate < 150) {
    candidate = 150;
  }
  if (candidate > _pdfMaxPagesUpperBound) {
    candidate = _pdfMaxPagesUpperBound;
  }
  return candidate;
}

class PdfTooManyPagesException implements Exception {
  final int totalRows;
  final int maxPages;
  final int estimatedPages;
  final int rowsPerPageHint;

  PdfTooManyPagesException({
    required this.totalRows,
    required this.maxPages,
    required this.estimatedPages,
    required this.rowsPerPageHint,
  });

  @override
  String toString() {
    return 'PDF would exceed $maxPages pages (estimated $estimatedPages pages for $totalRows rows, ~$rowsPerPageHint rows/page).';
  }
}

class _Row {
  final String type; // order | return | payment | refund
  final int id;
  final DateTime? date;
  final String? status;
  final double amount; // positive=debit, negative=credit
  final double? amountForCalc; // if null, use amount
  _Row({required this.type, required this.id, required this.date, required this.status, required this.amount, this.amountForCalc});
}

class _RowWithBalance {
  final _Row row;
  final double balance;
  _RowWithBalance({required this.row, required this.balance});
}

String _fmtDate(DateTime d) {
  final y = d.year.toString().padLeft(4, '0');
  final m = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '$y-$m-$day';
}

String _resolveClientNameForHeader(String? provided) {
  final candidate = (provided ?? Get.find<AccountStatementController>().clientName.value).toString().trim();
  if (candidate.isNotEmpty) return candidate;
  // fallback to ID string if name is empty
  return Get.find<AccountStatementController>().clientId.value.toString();
}
