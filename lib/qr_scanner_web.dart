@JS()
library script.js;

import 'dart:convert';
import 'dart:js_util';
import 'dart:typed_data';
import 'package:js/js.dart';

// import 'package:webviewx/webviewx.dart';
@JS()
external dynamic qrScannerScanImag(String image);

class QrScannerWeb extends QrScannerPlatform {
  @override
  Future<String?> fromImageBytes(Uint8List imageBytes, String mimeType) async {
    final base64 = base64Encode(imageBytes);
    final result = await promiseToFuture(
        qrScannerScanImag('data:$mimeType;base64,$base64'));

    print(result);
    return result;
  }
}

abstract class QrScannerPlatform {
  Future<String?> fromImageBytes(Uint8List imageBytes, String mimeType);

  static QrScannerPlatform? instance;
}
