@JS()
library qr_scanner_web.js;

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:js/js.dart';
import 'dart:js_util';
import 'dart:html' as html;

@JS('qrInImage')
external Future<String> _scan(image);

class QrScannerWeb {
  Future<String?> fromImageBytes(Uint8List imageBytes, String mimeType) async {
    final base64 = base64Encode(imageBytes);
    final result =
        await promiseToFuture(_scan('data:$mimeType;base64,$base64'));
    return result.toString();
  }
}
