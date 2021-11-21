@JS()
library qr_scanner_web.js;

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:js/js.dart';
import 'dart:js_util';
import 'dart:html' as html;
import 'package:flutter_web_plugins/flutter_web_plugins.dart' as fwp;

@JS('qrInImage')
external Future<String> _scan(image);

class QrScannerWeb extends QrScannerPlatform {
  static void registerWith(fwp.Registrar registrar) {
    var qrScannerWeb = QrScannerWeb();
    QrScannerPlatform.instance = qrScannerWeb;
  }

  @override
  Future<String?> fromImageBytes(Uint8List imageBytes, String mimeType) async {
    final base64 = base64Encode(imageBytes);
    final result =
        await promiseToFuture(_scan('data:$mimeType;base64,$base64'));
    return result.toString();
  }
}

abstract class QrScannerPlatform {
  Future<String?> fromImageBytes(Uint8List imageBytes, String mimeType);

  static QrScannerPlatform? instance;
}
